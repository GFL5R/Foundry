#!/usr/bin/env python3
"""
GFL5R Compendium Builder

Reads .djson files from the webapp data directory and converts them into
Foundry VTT Item/Actor documents, then builds LevelDB compendium packs.

Usage:
    python build-compendiums.py --webapp-data ../webapp/data --output ../packs

Requires: docstring-json, plyvel
"""
from __future__ import annotations

import argparse
import json
import random
import re
import string
import time
from pathlib import Path

import docstring_json

from leveldb_writer import LevelDBWriter

# Icon shortcodes -> Foundry-compatible HTML
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


def load_djson(path: Path) -> dict:
    parsed = docstring_json.load(str(path))
    return apply_shortcodes(parsed)


def build_weapon_item(name: str, data: dict) -> dict:
    return {
        "name": name,
        "type": "weaponry",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": data.get("description", ""),
            "category": data.get("category", "HG"),
            "skill": data.get("skill", "firearms"),
            "ideal_range": data.get("range", 0),
            "damage": data.get("damage", 0),
            "deadliness": data.get("deadliness", 0),
            "grip": data.get("grip", "1-Handed"),
            "threat": data.get("threat", 0),
            "signature": data.get("signature", 0),
            "qualities": data.get("qualities", []),
            "price": data.get("price", 0),
            "equipped": False,
            "readied": False,
        },
    }


def _normalize_approach(value) -> str:
    """Normalize an approach value to a lowercase id matching CONFIG.gfl5r.stances.

    Source djson uses title case ("Fortune"); some entries are a list of approaches
    (we keep the first since the sheet's approach picker is single-select); some are
    None. The Foundry technique sheet's <select> matches against lowercase option ids.
    """
    if not value:
        return ""
    if isinstance(value, list):
        value = value[0] if value else ""
    return str(value).strip().lower()


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


def _normalize_skill(value) -> str:
    """Normalize a skill value to a lowercase id matching CONFIG.gfl5r.skills.

    Source djson uses display labels ("Command", "Hand-to-Hand", "Exotic Weapons");
    the Foundry skills map keys on snake_case lowercase ids ("command",
    "hand_to_hand", "exotic_weapons"). technique-sheet.js's formatSkillList drops
    any value that isn't a known id, which is why mismatched casing renders blank.
    """
    if not value:
        return ""
    return str(value).strip().lower().replace("-", "_").replace(" ", "_")


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
            "skill": _normalize_skill(data.get("skill")),
            "activation": data.get("activation", "passive"),
            "difficulty": _extract_difficulty(data),
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
            "tags": data.get("tags", []),
        },
    }


def build_discipline_item(name: str, data: dict, perks: dict, capstones: dict, all_techniques: dict) -> dict:
    perk_name = data.get("perk", "")
    perk_data = perks.get(perk_name, {})
    capstone_name = data.get("capstone", "")
    capstone_data = capstones.get(capstone_name, {})

    # Build technique list with rank/type from cross-referenced technique data
    techniques = []
    for tech_name in data.get("techniques", []):
        tech_info = all_techniques.get(tech_name, {})
        techniques.append({
            "name": tech_name,
            "rank": tech_info.get("rank", 1),
            "type": tech_info.get("type", ""),
        })
    # Sort by rank then name
    techniques.sort(key=lambda t: (t["rank"], t["name"]))

    return {
        "name": name,
        "type": "discipline",
        "system": {
            "source_reference": {"source": "GFL5R", "page": 0},
            "flavor": data.get("flavor", ""),
            "description": "",
            "associated_skills": data.get("skills", []),
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
            "approach": data.get("approach") or "",
            "skill": data.get("skill") or "",
            "modifies": data.get("modifies", {}),
        },
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
            "price": data.get("price", 0),
            "rarity": data.get("rarity", "common"),
            "equipped": False,
        },
    }


def _uid(length=16):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def write_pack(items: list[dict], pack_path: Path):
    """Write items directly as a LevelDB compendium pack."""
    import shutil
    if pack_path.exists():
        shutil.rmtree(pack_path)

    now = int(time.time() * 1000)
    db = LevelDBWriter(pack_path)

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
        db.put(f"!items!{uid}", json.dumps(doc, ensure_ascii=False))

    db.write()


def main():
    parser = argparse.ArgumentParser(description="Build GFL5R compendium packs from webapp djson data")
    parser.add_argument("--webapp-data", type=Path, default=Path("data"),
                        help="Path to data/ directory containing .djson files")
    parser.add_argument("--packs-dir", type=Path, default=Path("packs"),
                        help="Output directory for LevelDB compendium packs")
    args = parser.parse_args()

    data_dir = args.webapp_data
    packs_dir = args.packs_dir
    packs_dir.mkdir(parents=True, exist_ok=True)

    if not data_dir.exists():
        raise SystemExit(f"Webapp data directory not found: {data_dir}")

    built = []

    # Weapons
    weapons_path = data_dir / "weapons.djson"
    if weapons_path.exists():
        weapons_data = load_djson(weapons_path)
        items = [build_weapon_item(name, data) for name, data in weapons_data.items()]
        write_pack(items, packs_dir / "gfl5r-weapons")
        built.append(f"gfl5r-weapons: {len(items)} items")

    # Techniques (one pack per type)
    techniques_dir = data_dir / "techniques"
    if techniques_dir.exists():
        for djson_path in sorted(techniques_dir.glob("*.djson")):
            tech_type = djson_path.stem  # e.g., "combat", "electronic_warfare"
            tech_data = load_djson(djson_path)
            items = [build_technique_item(name, data, tech_type) for name, data in tech_data.items()]
            pack_name = f"gfl5r-techniques-{tech_type.replace('_', '-')}"
            write_pack(items, packs_dir / pack_name)
            built.append(f"{pack_name}: {len(items)} items")

    # Narrative items
    for narrative_file, narrative_type, pack_suffix in [
        ("advantages.djson", "advantage", "narrative-advantages"),
        ("disadvantages.djson", "disadvantage", "narrative-disadvantages"),
        ("passions.djson", "passion", "narrative-passions"),
        ("anxieties.djson", "anxiety", "narrative-anxieties"),
    ]:
        path = data_dir / narrative_file
        if path.exists():
            data = load_djson(path)
            items = [build_narrative_item(name, d, narrative_type) for name, d in data.items()]
            write_pack(items, packs_dir / f"gfl5r-{pack_suffix}")
            built.append(f"gfl5r-{pack_suffix}: {len(items)} items")

    # Disciplines
    disc_path = data_dir / "disciplines.djson"
    if disc_path.exists():
        disc_data = load_djson(disc_path)
        # Load cross-reference data for disciplines
        perks = load_djson(data_dir / "perks.djson") if (data_dir / "perks.djson").exists() else {}
        capstones = load_djson(data_dir / "capstones.djson") if (data_dir / "capstones.djson").exists() else {}

        # Build discipline-perks compendium from perks data
        if perks:
            perk_items = [build_perk_item(name, data) for name, data in perks.items()]
            write_pack(perk_items, packs_dir / "gfl5r-discipline-perks")
            built.append(f"gfl5r-discipline-perks: {len(perk_items)} items")

        # Build discipline-capstones compendium from capstones data
        if capstones:
            capstone_items = [build_capstone_item(name, data) for name, data in capstones.items()]
            write_pack(capstone_items, packs_dir / "gfl5r-discipline-capstones")
            built.append(f"gfl5r-discipline-capstones: {len(capstone_items)} items")

        # Build technique lookup: name -> {rank, type}
        all_techniques = {}
        techniques_dir_ref = data_dir / "techniques"
        if techniques_dir_ref.exists():
            for djson_path in techniques_dir_ref.glob("*.djson"):
                tech_type = djson_path.stem.replace("_", " ").title()
                for t_name, t_data in load_djson(djson_path).items():
                    all_techniques[t_name] = {"rank": t_data.get("rank", 1), "type": tech_type}
        items = [build_discipline_item(name, data, perks, capstones, all_techniques) for name, data in disc_data.items()]
        write_pack(items, packs_dir / "gfl5r-disciplines")
        built.append(f"gfl5r-disciplines: {len(items)} items")

    # Modules
    modules_path = data_dir / "modules.djson"
    if modules_path.exists():
        modules_data = load_djson(modules_path)
        items = [build_module_item(name, data) for name, data in modules_data.items()]
        write_pack(items, packs_dir / "gfl5r-modules")
        built.append(f"gfl5r-modules: {len(items)} items")

    # General items
    items_path = data_dir / "items.djson"
    if items_path.exists():
        items_data = load_djson(items_path)
        items = [build_item(name, data) for name, data in items_data.items()]
        write_pack(items, packs_dir / "gfl5r-items")
        built.append(f"gfl5r-items: {len(items)} items")

    # Create empty packs for types without data yet
    for empty_pack in [
        "gfl5r-armor", "gfl5r-vehicles", "gfl5r-npcs",
        "gfl5r-journal-conditions", "gfl5r-macros",
    ]:
        pack_path = packs_dir / empty_pack
        if not pack_path.exists():
            write_pack([], pack_path)
            built.append(f"{empty_pack}: 0 items (stub)")

    print(f"Built {len(built)} compendium packs in {packs_dir}/:")
    for b in built:
        print(f"  {b}")


if __name__ == "__main__":
    main()
