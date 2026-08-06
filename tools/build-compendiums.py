#!/usr/bin/env python3
"""
GFL5R Compendium Builder

Reads standard .json files from the GFL5R webapp data directory and converts
them into Foundry VTT Item/Actor documents, then builds LevelDB compendium packs.

Usage:
    python build-compendiums.py \
        --webapp-src ../webapp/src/data \
        --data-dir data \
        --packs-dir packs

The --webapp-src path points to the canonical webapp data (gfl5r.org).
The --data-dir path is for local Foundry-only files (conditions, disciplines)
that don't have a webapp JSON equivalent yet.

Requires: docstring-json, plyvel
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import shutil
import string
import time
from pathlib import Path

# LevelDB is optional — falls back to JSON dump when plyvel is unavailable
_LEVELDB_AVAILABLE = False
try:
    from leveldb_writer import LevelDBWriter
    _LEVELDB_AVAILABLE = True
except ImportError:
    LevelDBWriter = None
    
_OUTPUT_FORMATS = ("leveldb", "json")

# ---------------------------------------------------------------------------
# Icon shortcodes
# ---------------------------------------------------------------------------
ICON_SHORTCODES = {
    "(op)": '<i class="i_opportunity"></i>',
    "(su)": '<i class="i_success"></i>',
    "(st)": '<i class="i_strife"></i>',
    "(ex)": '<i class="i_explosive"></i>',
}
SHORTCODE_PATTERN = re.compile("|".join(re.escape(k) for k in ICON_SHORTCODES))


def replace_shortcodes(text: str) -> str:
    return SHORTCODE_PATTERN.sub(lambda m: ICON_SHORTCODES[m.group()], text)


def apply_shortcodes(obj):
    if isinstance(obj, str):
        return replace_shortcodes(obj)
    if isinstance(obj, list):
        return [apply_shortcodes(item) for item in obj]
    if isinstance(obj, dict):
        return {key: apply_shortcodes(value) for key, value in obj.items()}
    return obj


# ---------------------------------------------------------------------------
# JSON loaders
# ---------------------------------------------------------------------------
def load_json(path: Path) -> dict | list:
    """Load a standard JSON file and apply shortcode replacement."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return apply_shortcodes(data)


def array_to_dict(arr: list, key_field: str = "name") -> dict:
    """Convert an array of objects into a dict keyed by *key_field*.

    Used for webapp formats where data is an array (advantages, NPCs, etc.)
    but the builder functions expect dicts keyed by entry name.
    """
    result = {}
    for entry in arr:
        k = entry.get(key_field)
        if k:
            result[k] = entry
    return result


# ---------------------------------------------------------------------------
# Field normalizers
# ---------------------------------------------------------------------------
def _normalize_approach(value) -> str:
    """Normalize an approach value to a lowercase id matching CONFIG.gfl5r.stances.

    Source JSON uses title case ("Fortune"); some entries are a list of
    approaches (keep the first); some are None/null.
    """
    if not value:
        return ""
    if isinstance(value, list):
        value = value[0] if value else ""
    return str(value).strip().lower()


def _normalize_skill(value) -> str:
    """Normalize a skill value to a lowercase snake_case id matching
    CONFIG.gfl5r.skills.

    Webapp JSON uses display labels ("Hand-to-Hand", "Exotic Weapons").
    The Foundry skills map keys on snake_case lowercase ("hand_to_hand").
    """
    if not value:
        return ""
    return str(value).strip().lower().replace("-", "_").replace(" ", "_")


_TN_RE = re.compile(r"TN\s+(\d+)\b")


def _extract_difficulty(data: dict) -> int:
    """Return the technique difficulty as an int.

    If the source data already specifies a numeric `difficulty`, use that;
    otherwise scan the description for the first "TN #" pattern. Defaults to 0.
    """
    raw = data.get("difficulty")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str) and raw.strip().isdigit():
        return int(raw.strip())
    desc = data.get("description", "") or ""
    m = _TN_RE.search(desc)
    return int(m.group(1)) if m else 0


def _normalize_keys(obj: dict, key_map: dict[str, str] | None = None) -> dict:
    """Return a new dict with all keys lowered and optionally remapped.

    Useful for normalising approach keys like {"Power": 1} → {"power": 1}
    and skill group keys like {"Combat": 2} → {"combat": 2}.
    """
    result = {}
    for k, v in obj.items():
        lowered = k.strip().lower()
        result[lowered] = v
    if key_map:
        for old_k, new_k in key_map.items():
            if old_k in result:
                result[new_k] = result.pop(old_k)
    return result


# ---------------------------------------------------------------------------
# Adapters: webapp JSON format → builder-ready dicts
# ---------------------------------------------------------------------------
def adapt_weapons(webapp_data: dict) -> dict:
    """Weapons: webapp format is already dict-keyed by name.

    Keys are already correct. The builders will normalize skill via
    _normalize_skill() at build time.
    """
    return webapp_data


def adapt_techniques(webapp_data: dict) -> dict[str, dict]:
    """Techniques: webapp has a single JSON keyed by type → array of entries.

    Returns a dict mapping type-slug → {name: entry_data, …}.

    The webapp stores entries in **paired format**: every technique entry
    (with flavor, rank, approach, skill) is immediately followed by an
    "Activation:" pseudo-entry (with activation text and opportunities).
    We pair them here, just as TechniquesPage.vue does.
    """
    result = {}
    for type_slug, entries in webapp_data.items():
        by_name = {}
        # Walk in pairs: technique + Activation: pseudo-entry
        for i in range(0, len(entries), 2):
            tech = entries[i]
            act = entries[i + 1] if i + 1 < len(entries) else None

            if tech.get("name") == "Activation:":
                continue  # safety: skip if we land on one out of sync

            name = tech.get("name", "")
            if not name:
                continue

            # Activation text lives on the technique entry itself (e.g. remoulding
            # techniques have their activation rules here). Opportunities live on the
            # "Activation:" partner entry.
            activation_text = (tech.get("activation") or "").strip()
            opportunities = (act.get("opportunities") or []) if act else []
            opportunities = [o for o in opportunities if o != "---"]

            # Compose a rich description: flavor (as italic), then activation
            # text (as a paragraph), then opportunities (as a list).
            desc_parts = []
            flavor = (tech.get("flavor") or "").strip()
            if flavor:
                desc_parts.append(f"<p><em>{flavor}</em></p>")
            if activation_text:
                # Convert newlines to <br> for Foundry HTML rendering
                act_html = activation_text.replace("\n\n", "</p><p>").replace("\n", "<br>")
                desc_parts.append(f"<p>{act_html}</p>")
            if opportunities:
                items = "".join(f"<li>{op}</li>" for op in opportunities)
                desc_parts.append(f"<h3>Opportunities</h3><ul>{items}</ul>")

            desc = "\n".join(desc_parts) if desc_parts else ""

            # Extract TN from activation text for difficulty
            m = _TN_RE.search(activation_text)
            difficulty = int(m.group(1)) if m else 0

            by_name[name] = {
                "rank": tech.get("rank", 1),
                "approach": tech.get("approach", ""),
                "skill": tech.get("skill", ""),
                "flavor": tech.get("flavor", ""),
                "description": desc,
                "activation": activation_text if activation_text else "passive",
                "difficulty": difficulty,
            }
        if by_name:
            result[type_slug] = by_name
    return result


def adapt_narrative(webapp_data: list, effects_to_desc: bool = True) -> dict:
    """Narrative items (advantages/disadvantages/passions/anxieties).

    Webapp format: array of {id, name, types[], flavor, effects[], ...}.
    Returns dict keyed by entry name with fields expected by the builder:
    {flavor, description, type[], tags[], ring_bonus}.
    """
    by_name = {}
    for entry in webapp_data:
        name = entry.get("name", "")
        if not name:
            continue

        # Build a description from the effects array
        if effects_to_desc and entry.get("effects"):
            items = "".join(f"<li>{e}</li>" for e in entry["effects"])
            desc = f"<h3>Effects</h3><ul>{items}</ul>"
        else:
            desc = entry.get("description", "")

        by_name[name] = {
            "flavor": entry.get("flavor", ""),
            "description": desc,
            "type": entry.get("types", entry.get("type", [])),
            "tags": entry.get("types", entry.get("tags", [])),
            "ring_bonus": entry.get("ring_bonus", ""),
        }
    return by_name


def adapt_npcs(webapp_data: list, narrative_sources: dict | None = None) -> dict:
    """NPCs: webapp format is an array of objects.

    Returns dict keyed by name with:
    - approaches keys lowered (e.g., "Power" → "power")
    - skills keys lowered (e.g., "Combat" → "combat")
    - description composed from attacks + specialRules
    - advantages/disadvantages/passion/anxiety as lists of name strings
    """
    by_name = {}
    for entry in webapp_data:
        name = entry.get("name", "")
        if not name:
            continue

        # Normalize approach keys
        raw_approaches = entry.get("approaches", {}) or {}
        approaches = _normalize_keys(raw_approaches) if raw_approaches else {}

        # Normalize skill group keys
        raw_skills = entry.get("skills", {}) or {}
        skills = _normalize_keys(raw_skills) if raw_skills else {}

        # Compose description (flavor + attacks + special rules)
        desc_parts = []
        if entry.get("flavor"):
            desc_parts.append(entry["flavor"])
        attacks = entry.get("attacks", [])
        if attacks:
            items = "".join(
                f"<li><strong>{a.get('name', '')}:</strong> {a.get('description', '')}</li>"
                for a in attacks
            )
            desc_parts.append(f"<h3>Attacks</h3><ul>{items}</ul>")
        special_rules = entry.get("specialRules", [])
        if special_rules:
            items = "".join(f"<li>{r}</li>" for r in special_rules)
            desc_parts.append(f"<h3>Special Rules</h3><ul>{items}</ul>")

        # Handle advantages/disadvantages (can be string or array of strings)
        advantages = entry.get("advantages")
        if isinstance(advantages, str):
            advantages_list = [advantages] if advantages else []
        else:
            advantages_list = list(advantages or [])

        disadvantages = entry.get("disadvantages")
        if isinstance(disadvantages, str):
            disadvantages_list = [disadvantages] if disadvantages else []
        else:
            disadvantages_list = list(disadvantages or [])

        passion = entry.get("passion", "")
        anxiety = entry.get("anxiety", "")

        # Derive threat_level from combatRating if not explicitly set
        raw_threat = entry.get("threat_level", "") or ""
        if raw_threat:
            threat_level = raw_threat
        else:
            cr = int(entry.get("combatRating", 0) or 0)
            if cr <= 5:
                threat_level = "minion"
            elif cr <= 11:
                threat_level = "standard"
            elif cr <= 16:
                threat_level = "elite"
            else:
                threat_level = "boss"

        by_name[name] = {
            "type": entry.get("type", ""),
            "threat_level": threat_level,
            "approaches": approaches,
            "skills": skills,
            "flavor": entry.get("flavor", ""),
            "description": "\n".join(desc_parts),
            "image": entry.get("image", ""),
            "behaviors": entry.get("behaviors", ""),
            "armor": entry.get("armor", 0),
            "advantages": advantages_list,
            "disadvantages": disadvantages_list,
            "passion": passion,
            "anxiety": anxiety,
            "combatRating": entry.get("combatRating", 0),
            "socialRating": entry.get("socialRating", 0),
        }
    return by_name


# ---------------------------------------------------------------------------
# Builders (unchanged logic — produce Foundry document dicts)
# ---------------------------------------------------------------------------
def build_weapon_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "weaponry",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "category": data.get("category", "HG"),
            "skill": _normalize_skill(data.get("skill", "firearms")),
            "ideal_range": data.get("range", 0),
            "damage": data.get("damage", 0),
            "deadliness": data.get("deadliness", 0),
            "grip": data.get("grip", "1-Handed"),
            "threat": data.get("threat", 0),
            "signature": data.get("signature", 0),
            "qualities": data.get("qualities", []),
            "price": data.get("price", 0),
            "rarity": data.get("rarity", "common"),
            "equipped": False,
            "readied": False,
        },
    }


def build_technique_item(name: str, data: dict, technique_type: str) -> dict:
    return {
        "name": name,
        "type": "technique",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "xp_cost": 3,
            "rank_required": data.get("rank", 1),
            "technique_type": technique_type,
            "approach": _normalize_approach(data.get("approach")),
            "skill": _normalize_skill(data.get("skill", "")),
            "activation": data.get("activation", "passive"),
            "difficulty": data.get("difficulty", _extract_difficulty(data)),
        },
    }


def build_perk_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "technique",
        "img": "systems/gfl5r/assets/icons/techs/perk.svg",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "xp_cost": 0,
            "rank_required": 1,
            "technique_type": "perk",
            "approach": "",
            "skill": "",
            "activation": "passive",
            "difficulty": _extract_difficulty(data),
        },
    }


def build_capstone_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "technique",
        "img": "systems/gfl5r/assets/icons/techs/capstone.svg",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "xp_cost": 0,
            "rank_required": 3,
            "technique_type": "capstone",
            "approach": "",
            "skill": "",
            "activation": "passive",
            "difficulty": _extract_difficulty(data),
        },
    }


def build_narrative_item(name: str, data: dict, narrative_type: str) -> dict:
    return {
        "name": name,
        "type": "narrative",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "narrative_type": narrative_type,
            "ring_bonus": data.get("ring_bonus") or "",
            "tags": data.get("type", data.get("tags", [])),
        },
    }


def build_discipline_item(name: str, data: dict, perks: dict, capstones: dict, all_techniques: dict) -> dict:
    perk_name = data.get("perk", "")
    perk_data = perks.get(perk_name, {})
    capstone_name = data.get("capstone", "")
    capstone_data = capstones.get(capstone_name, {})

    techniques = []
    for tech_name in data.get("techniques", []):
        tech_info = all_techniques.get(tech_name, {})
        techniques.append({
            "name": tech_name,
            "rank": tech_info.get("rank", 1),
            "type": tech_info.get("type", ""),
        })
    techniques.sort(key=lambda t: (t["rank"], t["name"]))

    return {
        "name": name,
        "type": "discipline",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": "",
            "associated_skills": data.get("skills", []),
            "starting_weapon": {
                "category": data.get("starting_weapon", {}).get("category", ""),
                "max_price": data.get("starting_weapon", {}).get("max_price", 0),
            },
            "perk": {
                "name": perk_name,
                "flavor": perk_data.get("flavor", ""),
                "description": perk_data.get("description", ""),
            },
            "capstone": {
                "name": capstone_name,
                "flavor": capstone_data.get("flavor", ""),
                "description": capstone_data.get("description", ""),
            },
            "techniques": techniques,
        },
    }


def build_module_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "module",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "module_type": data.get("type", "Frame Augmentation"),
            "cost": data.get("cost", 0),
            "price": data.get("price", data.get("cost", 0)),
            "approach": _normalize_approach(data.get("approach") or ""),
            "skill": _normalize_skill(data.get("skill") or ""),
            "modifies": data.get("modifies", {}),
        },
    }


def build_armor_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "armor",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "weight": data.get("weight", 0),
            "signature": data.get("signature", 0),
            "protection": data.get("protection", 0),
            "price": data.get("price", data.get("cost", 0)),
            "rarity": data.get("rarity", "common"),
            "equipped": False,
        },
    }


def _vehicle_image_path(raw: str) -> str:
    if not raw:
        return "systems/gfl5r/assets/icons/actors/vehicle.svg"
    raw = raw.lstrip("/")
    if raw.startswith("assets/"):
        raw = raw[len("assets/"):]
    return f"systems/gfl5r/assets/{raw}"


def build_vehicle_actor(name: str, data: dict) -> dict:
    """Build a vehicle Actor document from webapp vehicles.json data."""
    # Compose description from flavor + description
    flavor = (data.get("flavor") or "").strip()
    description = (data.get("description") or "").strip()
    desc_parts = []
    if flavor:
        desc_parts.append(flavor)
    if description:
        desc_parts.append(description)

    # Map webapp weapons to actor weapons schema
    weapons = []
    for w in data.get("weapons", []) or []:
        weapons.append({
            "name": w.get("name", ""),
            "mount": w.get("mount", ""),
            "category": w.get("category", ""),
            "skill": w.get("skill", "Firearms"),
            "range": int(w.get("range", 3)),
            "damage": int(w.get("damage", 0)),
            "deadliness": int(w.get("deadliness", 0)),
            "qualities": w.get("qualities", []),
            "notes": w.get("notes", ""),
        })

    dt = int(data.get("damage_threshold", 10))

    return {
        "name": name,
        "type": "vehicle",
        "img": _vehicle_image_path(data.get("image", "")),
        "system": {
            "identity": {
                "manufacturer": "",
                "model": data.get("type", ""),
            },
            "narrative": {
                "notes": "",
                "description": "\n".join(desc_parts),
                "personal_goal": "",
                "name_meaning": "",
                "story_end": "",
                "met_commander": "",
            },
            "vehicle_type": data.get("type", ""),
            "armor_value": int(data.get("armor_value", 0)),
            "damage_threshold": dt,
            "current_damage": {"value": 0, "max": dt},
            "speed": int(data.get("speed", 3)),
            "passenger_slots": {
                "total": int(data.get("passenger_capacity", 0)),
                "occupied": [],
            },
            "crew": {
                "required": int(data.get("crew", 1)),
                "minimum": int(data.get("min_crew", 1)),
                "notes": data.get("crew_notes", ""),
            },
            "losing_ground": 0,
            "weapons": weapons,
            "price": int(data.get("price", 0)),
            "rarity": int(data.get("rarity", 0)),
        },
        "items": [],
    }


def build_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "item",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "quantity": 1,
            "weight": data.get("weight", 0),
            "price": data.get("price", data.get("cost", 0)),
            "rarity": data.get("rarity", "common"),
            "equipped": False,
        },
    }


# ---------------------------------------------------------------------------
# Conditions (journal entry builder)
# ---------------------------------------------------------------------------
def _effects_html(effects: list) -> str:
    if not effects:
        return ""
    items = "".join(f"<li>{e}</li>" for e in effects)
    return f"<h3>Effects</h3><ul>{items}</ul>"


def build_condition_page_content(data: dict) -> str:
    condition_type = data.get("type", "standard")
    parts = []

    description = (data.get("description") or "").strip()
    if description:
        parts.append(description)

    if condition_type == "staged":
        shared_rules = data.get("shared_rules", [])
        if shared_rules:
            items = "".join(f"<li>{r}</li>" for r in shared_rules)
            parts.append(f"<h3>Shared Rules</h3><ul>{items}</ul>")
        stages = data.get("stages", {})
        for stage_name, stage_data in stages.items():
            parts.append(f"<h3>{stage_name}</h3>")
            stage_desc = (stage_data.get("description") or "").strip()
            if stage_desc:
                parts.append(stage_desc)
            parts.append(_effects_html(stage_data.get("effects", [])))
    elif condition_type == "wounded":
        parts.append(_effects_html(data.get("effects", [])))
        recovery = data.get("recovery", [])
        if recovery:
            items = "".join(f"<li>{r}</li>" for r in recovery)
            parts.append(f"<h3>Recovery</h3><ul>{items}</ul>")
    else:
        parts.append(_effects_html(data.get("effects", [])))
        removal = data.get("removal")
        if removal:
            parts.append(f"<h3>Removal</h3><p>{removal}</p>")

    return "".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Writer functions
# ---------------------------------------------------------------------------
def _uid(length=16):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def _get_writer(pack_path: Path):
    """Return a (writer, write_method, close_method) tuple.

    If LevelDB is available, returns a LevelDBWriter instance.
    Otherwise, creates the pack directory and returns a JSON-file-based writer.
    """
    if _LEVELDB_AVAILABLE:
        if pack_path.exists():
            shutil.rmtree(pack_path)
        return LevelDBWriter(pack_path), "put", "write"
    else:
        pack_path.mkdir(parents=True, exist_ok=True)
        return pack_path, "json_put", None  # handled specially


JSON_PACK_DOCS: dict[str, list[dict]] = {}


def _json_put(pack_path: Path, key: str, value: str):
    """JSON-fallback: collect documents in memory per pack_path."""
    key_str = str(pack_path)
    if key_str not in JSON_PACK_DOCS:
        JSON_PACK_DOCS[key_str] = []
    JSON_PACK_DOCS[key_str].append({"key": key, "value": json.loads(value)})


def _json_write(pack_path: Path):
    """Write collected documents as a JSON array with a _meta header."""
    key_str = str(pack_path)
    docs = JSON_PACK_DOCS.pop(key_str, [])
    out = {
        "_meta": {
            "packName": pack_path.name,
            "format": "gfl5r-json-pack",
            "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "documentCount": len(docs),
        },
        "documents": [d["value"] for d in docs],
    }
    out_path = pack_path / "pack.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


def write_journal_pack(entries: list[dict], pack_path: Path):
    """Write JournalEntry documents as a compendium pack."""
    if pack_path.exists():
        shutil.rmtree(pack_path)

    now = int(time.time() * 1000)
    writer, write_mode, close_mode = _get_writer(pack_path)

    stats_base = {
        "compendiumSource": None,
        "duplicateSource": None,
        "exportSource": None,
        "coreVersion": "13.351",
        "systemId": "gfl5r",
        "systemVersion": "0.1.0",
        "createdTime": now,
        "modifiedTime": now,
        "lastModifiedBy": None,
    }

    for entry in entries:
        jid = _uid()
        pid = _uid()

        page_doc = {
            "_id": pid,
            "name": entry["name"],
            "type": "text",
            "title": {"show": False, "level": 1},
            "text": {"content": entry["content"], "format": 1, "markdown": None},
            "video": {"controls": True, "volume": 0.5},
            "src": None,
            "system": {},
            "sort": 0,
            "ownership": {"default": -1},
            "flags": {},
            "_stats": dict(stats_base),
        }

        journal_doc = {
            "_id": jid,
            "name": entry["name"],
            "pages": [page_doc],
            "folder": None,
            "sort": 0,
            "ownership": {"default": 0},
            "flags": {},
            "_stats": dict(stats_base),
        }

        if write_mode == "put":
            writer.put(f"!journal!{jid}", json.dumps(journal_doc, ensure_ascii=False))
            writer.put(f"!journal.pages!{jid}.{pid}", json.dumps(page_doc, ensure_ascii=False))
        else:
            _json_put(pack_path, f"!journal!{jid}", json.dumps(journal_doc, ensure_ascii=False))
            _json_put(pack_path, f"!journal.pages!{jid}.{pid}", json.dumps(page_doc, ensure_ascii=False))

    if write_mode == "put":
        writer.write()
    else:
        _json_write(pack_path)


def write_actor_pack(actors: list[dict], pack_path: Path):
    """Write Actor documents (with embedded Items) as a compendium pack."""
    if pack_path.exists():
        shutil.rmtree(pack_path)

    now = int(time.time() * 1000)
    writer, write_mode, close_mode = _get_writer(pack_path)

    stats_base = {
        "compendiumSource": None,
        "duplicateSource": None,
        "exportSource": None,
        "coreVersion": "13.351",
        "systemId": "gfl5r",
        "systemVersion": "0.1.0",
        "createdTime": now,
        "modifiedTime": now,
        "lastModifiedBy": None,
    }

    for actor in actors:
        aid = _uid()
        embedded = actor.get("items", []) or []
        item_docs = []
        for item in embedded:
            iid = _uid()
            item_doc = {
                "_id": iid,
                "name": item["name"],
                "type": item["type"],
                "img": item.get("img", "icons/svg/item-bag.svg"),
                "system": item.get("system", {}),
                "effects": [],
                "folder": None,
                "sort": 0,
                "ownership": {"default": 0},
                "flags": {},
                "_stats": dict(stats_base),
            }
            item_docs.append(item_doc)

        actor_doc = {
            "_id": aid,
            "name": actor["name"],
            "type": actor["type"],
            "img": actor.get("img", "icons/svg/mystery-man.svg"),
            "system": actor.get("system", {}),
            "prototypeToken": {
                "name": actor["name"],
                "displayName": 0,
                "actorLink": False,
                "disposition": 0,
                "texture": {"src": actor.get("img", "icons/svg/mystery-man.svg")},
                "bar1": {"attribute": "fatigue"},
                "bar2": {"attribute": "strife"},
            },
            "items": item_docs,
            "effects": [],
            "folder": None,
            "sort": 0,
            "ownership": {"default": 0},
            "flags": {},
            "_stats": dict(stats_base),
        }

        if write_mode == "put":
            writer.put(f"!actors!{aid}", json.dumps(actor_doc, ensure_ascii=False))
            for item_doc in item_docs:
                writer.put(
                    f"!actors.items!{aid}.{item_doc['_id']}",
                    json.dumps(item_doc, ensure_ascii=False),
                )
        else:
            _json_put(pack_path, f"!actors!{aid}", json.dumps(actor_doc, ensure_ascii=False))
            for item_doc in item_docs:
                _json_put(pack_path, f"!actors.items!{aid}.{item_doc['_id']}", json.dumps(item_doc, ensure_ascii=False))

    if write_mode == "put":
        writer.write()
    else:
        _json_write(pack_path)


def write_pack(items: list[dict], pack_path: Path):
    """Write items directly as a compendium pack."""
    if pack_path.exists():
        shutil.rmtree(pack_path)

    now = int(time.time() * 1000)
    writer, write_mode, close_mode = _get_writer(pack_path)

    for item in items:
        uid = _uid()
        doc = {
            "name": item["name"],
            "type": item["type"],
            "_id": uid,
            "img": item.get("img", "icons/svg/item-bag.svg"),
            "system": item.get("system", {}),
            "effects": [],
            "folder": None,
            "sort": 0,
            "ownership": {"default": 0},
            "flags": {},
            "_stats": {
                "compendiumSource": None,
                "duplicateSource": None,
                "exportSource": None,
                "coreVersion": "13.351",
                "systemId": "gfl5r",
                "systemVersion": "0.1.0",
                "createdTime": now,
                "modifiedTime": now,
                "lastModifiedBy": None,
            },
        }
        if write_mode == "put":
            writer.put(f"!items!{uid}", json.dumps(doc, ensure_ascii=False))
        else:
            _json_put(pack_path, f"!items!{uid}", json.dumps(doc, ensure_ascii=False))

    if write_mode == "put":
        writer.write()
    else:
        _json_write(pack_path)


# ---------------------------------------------------------------------------
# NPC embedded narrative helpers
# ---------------------------------------------------------------------------
def _npc_image_path(raw: str) -> str:
    if not raw:
        return "systems/gfl5r/assets/icons/actors/doll.svg"
    raw = raw.lstrip("/")
    if raw.startswith("assets/"):
        raw = raw[len("assets/"):]
    return f"systems/gfl5r/assets/{raw}"


_SKILL_GROUPS = ("combat", "fieldcraft", "technical", "social")


def build_npc_actor(name: str, data: dict, narrative_sources: dict) -> dict:
    """Build an NPC actor document (with embedded narrative items)."""
    npc_type = data.get("type", "")
    character_type = "t-doll" if npc_type == "T-Doll" else "human"

    approaches = data.get("approaches", {}) or {}
    power = int(approaches.get("power", 1))
    precision = int(approaches.get("precision", 1))
    swiftness = int(approaches.get("swiftness", 1))
    resilience = int(approaches.get("resilience", 1))
    fortune = int(approaches.get("fortune", 1))

    endurance_mult = 3 if character_type == "t-doll" else 2
    endurance = (power + resilience) * endurance_mult
    composure = (resilience + swiftness) * 2
    focus = power + precision
    vigilance = (precision + swiftness + 1) // 2

    raw_skills = data.get("skills", {}) or {}
    skills = {group: int(raw_skills.get(group, 0)) for group in _SKILL_GROUPS}

    narrative_parts = []
    flavor_html = data.get("flavor", "") or ""
    description_html = data.get("description", "") or ""
    if flavor_html.strip():
        narrative_parts.append(flavor_html.strip())
    if description_html.strip():
        narrative_parts.append(description_html.strip())
    armor_val = data.get("armor")
    if armor_val:
        narrative_parts.append(f"<p><strong>Armor:</strong> {armor_val}</p>")
    narrative_description = "\n".join(narrative_parts)

    embedded_items = []
    for adv in data.get("advantages", []) or []:
        embedded_items.append(_build_embedded_narrative(adv, "advantage", narrative_sources.get("advantage", {})))
    for dis in data.get("disadvantages", []) or []:
        embedded_items.append(_build_embedded_narrative(dis, "disadvantage", narrative_sources.get("disadvantage", {})))
    passion = data.get("passion")
    if passion:
        embedded_items.append(_build_embedded_narrative(passion, "passion", narrative_sources.get("passion", {})))
    anxiety = data.get("anxiety")
    if anxiety:
        embedded_items.append(_build_embedded_narrative(anxiety, "anxiety", narrative_sources.get("anxiety", {})))

    return {
        "name": name,
        "type": "npc",
        "img": _npc_image_path(data.get("image", "")),
        "system": {
            "approaches": {
                "power": power,
                "precision": precision,
                "swiftness": swiftness,
                "resilience": resilience,
                "fortune": fortune,
            },
            "social": {
                "humanity": 50,
                "fame": 40,
                "status": 30,
                "stress_tell": "",
                "view_of_dolls": "",
            },
            "skills": skills,
            "threat_level": data.get("threat_level", "standard"),
            "behaviors": data.get("behaviors", "") or "",
            "combat_rating": int(data.get("combatRating", 0) or 0),
            "social_rating": int(data.get("socialRating", 0) or 0),
            "endurance": endurance,
            "composure": composure,
            "focus": focus,
            "vigilance": vigilance,
            "fortune_points": {"max": fortune, "value": fortune},
            "fatigue": {"max": endurance, "value": 0},
            "strife": {"max": composure, "value": 0},
            "heat": 0,
            "stance": "power",
            "prepared": True,
            "harm": {
                "wounded": {
                    "power": None, "precision": None, "swiftness": None,
                    "resilience": None, "fortune": None,
                },
                "elid_stage": 0,
                "parapluie_stage": 0,
                "collapse": {"max": 0, "value": 0},
            },
            "narrative": {
                "notes": "",
                "description": narrative_description,
                "personal_goal": "",
                "name_meaning": "",
                "story_end": "",
                "met_commander": "",
            },
        },
        "items": embedded_items,
    }


def _build_embedded_narrative(name: str, narrative_type: str, source: dict) -> dict:
    entry = source.get(name, {}) if source else {}
    tags = entry.get("type", []) or entry.get("tags", [])
    if isinstance(tags, str):
        tags = [tags]
    return build_narrative_item(name, {
        "flavor": entry.get("flavor", ""),
        "description": entry.get("description", ""),
        "ring_bonus": entry.get("ring_bonus", ""),
        "tags": tags,
    }, narrative_type)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Build GFL5R compendium packs from webapp JSON data"
    )
    parser.add_argument("--webapp-src", type=Path, default=Path("../webapp/src/data"),
                        help="Path to webapp src/data/ directory (canonical game data)")
    parser.add_argument("--data-dir", type=Path, default=Path("data"),
                        help="Path to local Foundry data/ directory (conditions, disciplines, etc.)")
    parser.add_argument("--packs-dir", type=Path, default=Path("packs"),
                        help="Output directory for compendium packs")
    parser.add_argument("--format", choices=_OUTPUT_FORMATS,
                        default="leveldb" if _LEVELDB_AVAILABLE else "json",
                        help="Output format: leveldb (requires plyvel) or json (fallback)")
    args = parser.parse_args()

    webapp_src = args.webapp_src
    data_dir = args.data_dir
    packs_dir = args.packs_dir
    packs_dir.mkdir(parents=True, exist_ok=True)

    built = []

    # -----------------------------------------------------------------------
    # Weapons (webapp src)
    # -----------------------------------------------------------------------
    weapons_path = webapp_src / "weapons.json"
    if weapons_path.exists():
        weapons_data = load_json(weapons_path)
        items = [build_weapon_item(name, data) for name, data in weapons_data.items()]
        write_pack(items, packs_dir / "gfl5r-weapons")
        built.append(f"gfl5r-weapons: {len(items)} items")

    # -----------------------------------------------------------------------
    # Techniques (webapp src — single JSON keyed by type)
    # -----------------------------------------------------------------------
    techniques_path = webapp_src / "techniques.json"
    if techniques_path.exists():
        raw = load_json(techniques_path)
        adapted = adapt_techniques(raw)
        for tech_type, by_name in adapted.items():
            items = [build_technique_item(name, data, tech_type) for name, data in by_name.items()]
            pack_name = f"gfl5r-techniques-{tech_type.replace('_', '-')}"
            write_pack(items, packs_dir / pack_name)
            built.append(f"{pack_name}: {len(items)} items")

    # -----------------------------------------------------------------------
    # Narrative items (webapp src — arrays)
    # -----------------------------------------------------------------------
    for narrative_file, narrative_type, pack_suffix in [
        ("advantages.json", "advantage", "narrative-advantages"),
        ("disadvantages.json", "disadvantage", "narrative-disadvantages"),
        ("passions.json", "passion", "narrative-passions"),
        ("anxieties.json", "anxiety", "narrative-anxieties"),
    ]:
        path = webapp_src / narrative_file
        if path.exists():
            raw = load_json(path)
            if isinstance(raw, list):
                adapted = adapt_narrative(raw)
            else:
                adapted = raw  # already a dict
            items = [build_narrative_item(name, d, narrative_type) for name, d in adapted.items()]
            write_pack(items, packs_dir / f"gfl5r-{pack_suffix}")
            built.append(f"gfl5r-{pack_suffix}: {len(items)} items")

    # -----------------------------------------------------------------------
    # Disciplines (local data-dir — standard JSON, not djson)
    # -----------------------------------------------------------------------
    disc_path = data_dir / "disciplines.json"
    if disc_path.exists():
        disc_data = load_json(disc_path)

        perks = {}
        perks_path = webapp_src / "perks.json"
        if perks_path.exists():
            perks = load_json(perks_path)

        capstones = {}
        capstones_path = webapp_src / "capstones.json"
        if capstones_path.exists():
            capstones = load_json(capstones_path)

        # Build discipline-perks compendium
        if perks:
            perk_items = [build_perk_item(name, data) for name, data in perks.items()]
            write_pack(perk_items, packs_dir / "gfl5r-discipline-perks")
            built.append(f"gfl5r-discipline-perks: {len(perk_items)} items")

        # Build discipline-capstones compendium
        if capstones:
            capstone_items = [build_capstone_item(name, data) for name, data in capstones.items()]
            write_pack(capstone_items, packs_dir / "gfl5r-discipline-capstones")
            built.append(f"gfl5r-discipline-capstones: {len(capstone_items)} items")

        # Build technique lookup: name -> {rank, type}
        all_techniques = {}
        techniques_path_ref = webapp_src / "techniques.json"
        if techniques_path_ref.exists():
            raw = load_json(techniques_path_ref)
            adapted = adapt_techniques(raw)
            for tech_type, by_name in adapted.items():
                display_type = tech_type.replace("_", " ").title()
                for t_name, t_data in by_name.items():
                    all_techniques[t_name] = {"rank": t_data.get("rank", 1), "type": display_type}

        items = [build_discipline_item(name, data, perks, capstones, all_techniques) for name, data in disc_data.items()]
        write_pack(items, packs_dir / "gfl5r-disciplines")
        built.append(f"gfl5r-disciplines: {len(items)} items")

    # -----------------------------------------------------------------------
    # Modules (webapp src)
    # -----------------------------------------------------------------------
    modules_path = webapp_src / "modules.json"
    if modules_path.exists():
        modules_data = load_json(modules_path)
        items = [build_module_item(name, data) for name, data in modules_data.items()]
        write_pack(items, packs_dir / "gfl5r-modules")
        built.append(f"gfl5r-modules: {len(items)} items")

    # -----------------------------------------------------------------------
    # General items (webapp src)
    # -----------------------------------------------------------------------
    items_path = webapp_src / "items.json"
    if items_path.exists():
        items_data = load_json(items_path)
        items = [build_item(name, data) for name, data in items_data.items()]
        write_pack(items, packs_dir / "gfl5r-items")
        built.append(f"gfl5r-items: {len(items)} items")

    # -----------------------------------------------------------------------
    # Armor (webapp src)
    # -----------------------------------------------------------------------
    armor_path = webapp_src / "armor.json"
    if armor_path.exists():
        armor_data = load_json(armor_path)
        items = [build_armor_item(name, data) for name, data in armor_data.items()]
        write_pack(items, packs_dir / "gfl5r-armor")
        built.append(f"gfl5r-armor: {len(items)} items")

    # -----------------------------------------------------------------------
    # NPCs (webapp src — array)
    # -----------------------------------------------------------------------
    npcs_path = webapp_src / "npcs.json"
    if npcs_path.exists():
        raw = load_json(npcs_path)
        if isinstance(raw, list):
            npcs_data = adapt_npcs(raw)
        else:
            npcs_data = raw

        # Load narrative sources for embedded items
        narrative_sources = {}
        for narrative_type, fname in [
            ("advantage", "advantages.json"),
            ("disadvantage", "disadvantages.json"),
            ("passion", "passions.json"),
            ("anxiety", "anxieties.json"),
        ]:
            path = webapp_src / fname
            if path.exists():
                raw_n = load_json(path)
                if isinstance(raw_n, list):
                    narrative_sources[narrative_type] = adapt_narrative(raw_n)
                else:
                    narrative_sources[narrative_type] = raw_n

        actors = [build_npc_actor(name, data, narrative_sources) for name, data in npcs_data.items()]
        write_actor_pack(actors, packs_dir / "gfl5r-npcs")
        built.append(f"gfl5r-npcs: {len(actors)} actors")

    # -----------------------------------------------------------------------
    # Conditions (local data-dir — standard JSON)
    # -----------------------------------------------------------------------
    conditions_path = data_dir / "conditions.json"
    if conditions_path.exists():
        conditions_data = load_json(conditions_path)
        entries = [
            {"name": name, "content": build_condition_page_content(data)}
            for name, data in conditions_data.items()
        ]
        write_journal_pack(entries, packs_dir / "gfl5r-journal-conditions")
        built.append(f"gfl5r-journal-conditions: {len(entries)} entries")

    # -----------------------------------------------------------------------
    # Vehicles (webapp src)
    # -----------------------------------------------------------------------
    vehicles_path = webapp_src / "vehicles.json"
    if vehicles_path.exists():
        vehicles_data = load_json(vehicles_path)
        actors = [build_vehicle_actor(name, data) for name, data in vehicles_data.items()]
        write_actor_pack(actors, packs_dir / "gfl5r-vehicles")
        built.append(f"gfl5r-vehicles: {len(actors)} actors")

    # -----------------------------------------------------------------------
    # Empty stub packs
    # -----------------------------------------------------------------------
    for empty_pack in ["gfl5r-macros"]:
        pack_path = packs_dir / empty_pack
        if not pack_path.exists():
            write_pack([], pack_path)
            built.append(f"{empty_pack}: 0 items (stub)")

    print(f"Built {len(built)} compendium packs in {packs_dir}/:")
    for b in built:
        print(f"  {b}")


if __name__ == "__main__":
    main()