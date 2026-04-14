"""
Minimal LevelDB writer for Foundry VTT compendium packs.

Writes a LevelDB database that classic-level (used by Foundry) can read.
Only supports creating new databases from scratch (no reads, no updates).

Strategy: write entries to a WAL (Write-Ahead Log) file and let classic-level
build its own SSTables on first open. This avoids having to produce a
pixel-perfect SSTable, which is fragile and error-prone.

LevelDB on-disk format reference:
  https://github.com/google/leveldb/blob/main/doc/log_format.md
  https://github.com/google/leveldb/blob/main/doc/impl.md
"""
from __future__ import annotations

import struct
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _encode_varint(value: int) -> bytes:
    result = bytearray()
    while value > 0x7F:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value & 0x7F)
    return bytes(result)


# Pre-compute CRC32C lookup table once at module level
_CRC_TABLE: list[int] = []
for _i in range(256):
    _c = _i
    for _ in range(8):
        _c = ((_c >> 1) ^ 0x82F63B78) if (_c & 1) else (_c >> 1)
    _CRC_TABLE.append(_c)


def _crc32c(data: bytes) -> int:
    """CRC32C (Castagnoli) checksum used by LevelDB."""
    crc = 0xFFFFFFFF
    for byte in data:
        crc = _CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >> 8)
    return crc ^ 0xFFFFFFFF


def _mask_crc(crc: int) -> int:
    """Mask a CRC value the way LevelDB expects."""
    return (((crc >> 15) | (crc << 17)) + 0xA282EAD8) & 0xFFFFFFFF


# ---------------------------------------------------------------------------
# Log-file writer (shared by WAL and MANIFEST)
# ---------------------------------------------------------------------------

_LOG_BLOCK_SIZE = 32768
_LOG_HEADER_SIZE = 7  # 4 (crc) + 2 (length) + 1 (type)

# Record types
_FULL = 1
_FIRST = 2
_MIDDLE = 3
_LAST = 4


def _build_log_file(records: list[bytes]) -> bytes:
    """Encode *records* into a LevelDB log file (handles block boundaries)."""
    buf = bytearray()
    block_offset = 0

    for record in records:
        data_left = memoryview(record)
        first_fragment = True

        while len(data_left):
            space = _LOG_BLOCK_SIZE - block_offset
            if space < _LOG_HEADER_SIZE:
                # Pad remainder of block with zeros
                buf += b"\x00" * space
                block_offset = 0
                space = _LOG_BLOCK_SIZE

            avail = space - _LOG_HEADER_SIZE
            frag_len = min(avail, len(data_left))
            is_end = frag_len == len(data_left)

            if first_fragment and is_end:
                rtype = _FULL
            elif first_fragment:
                rtype = _FIRST
            elif is_end:
                rtype = _LAST
            else:
                rtype = _MIDDLE

            fragment = bytes(data_left[:frag_len])
            crc = _mask_crc(_crc32c(bytes([rtype]) + fragment))

            buf += struct.pack("<I", crc)
            buf += struct.pack("<H", frag_len)
            buf.append(rtype)
            buf += fragment

            block_offset += _LOG_HEADER_SIZE + frag_len
            data_left = data_left[frag_len:]
            first_fragment = False

    return bytes(buf)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class LevelDBWriter:
    """Write a minimal LevelDB database using the WAL approach.

    Entries are written to a Write-Ahead Log; classic-level will replay the
    log and build SSTables when Foundry first opens the compendium.
    """

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.entries: list[tuple[bytes, bytes]] = []

    def put(self, key: str, value: str):
        self.entries.append((key.encode("utf-8"), value.encode("utf-8")))

    def write(self):
        self.db_path.mkdir(parents=True, exist_ok=True)

        # --- WAL (000002.log) ---
        if self.entries:
            wal_data = self._build_write_batch()
            (self.db_path / "000002.log").write_bytes(
                _build_log_file([wal_data])
            )
        else:
            # Empty WAL for empty packs
            (self.db_path / "000002.log").write_bytes(b"")

        # --- MANIFEST-000001 ---
        manifest_edit = self._build_version_edit()
        (self.db_path / "MANIFEST-000001").write_bytes(
            _build_log_file([manifest_edit])
        )

        # --- CURRENT ---
        (self.db_path / "CURRENT").write_text("MANIFEST-000001\n")

        # --- LOG (informational log, not WAL — can be empty) ---
        (self.db_path / "LOG").write_text("")

    # -- private helpers --------------------------------------------------

    def _build_write_batch(self) -> bytes:
        """Build a WriteBatch payload for the WAL."""
        batch = bytearray()
        batch += struct.pack("<Q", 1)            # sequence number
        batch += struct.pack("<I", len(self.entries))  # entry count

        for key, value in self.entries:
            batch.append(1)                        # kTypeValue
            batch += _encode_varint(len(key))
            batch += key
            batch += _encode_varint(len(value))
            batch += value

        return bytes(batch)

    def _build_version_edit(self) -> bytes:
        """Build a single VersionEdit record for the MANIFEST.

        Tells classic-level: use comparator X, replay WAL from file 2,
        allocate file numbers starting at 3, sequence starts at 0.
        """
        edit = bytearray()

        # Tag 1 — comparator
        edit.append(1)
        comp = b"leveldb.BytewiseComparator"
        edit += _encode_varint(len(comp))
        edit += comp

        # Tag 2 — log number (points to 000002.log)
        edit.append(2)
        edit += _encode_varint(2)

        # Tag 3 — next file number
        edit.append(3)
        edit += _encode_varint(3)

        # Tag 4 — last sequence (0; will be updated after WAL replay)
        edit.append(4)
        edit += _encode_varint(0)

        return bytes(edit)
