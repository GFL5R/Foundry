#!/usr/bin/env python3
import argparse
import json
import os
import random
import string
import time
import plyvel


def generate_uid(length=16):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def export_pack(pack_path: str, json_path: str):
    # Load system.json for version and id
    with open('system.json', 'r', encoding='utf-8') as f:
        system_data = json.load(f)
    system_id = system_data.get('id', os.path.basename(os.getcwd()))
    system_version = system_data.get('version', '0.0.1')
    
    db = plyvel.DB(pack_path)
    
    # First pass: build folder ID -> name mapping and collect folder data
    folder_map = {}  # id -> name
    folders_data = {}  # name -> properties
    for key, value in db:
        key_str = key.decode('utf-8')
        if key_str.startswith('!folders!'):
            folder = json.loads(value.decode('utf-8'))
            folder_id = folder.get('_id')
            folder_name = folder.get('name')
            if folder_id and folder_name:
                folder_map[folder_id] = folder_name
                folders_data[folder_name] = {
                    'color': folder.get('color'),
                    'sorting': folder.get('sorting', 'a'),
                }
    
    # Second pass: export items with folder names instead of IDs
    items_data = {}
    for key, value in db:
        key_str = key.decode('utf-8')
        if key_str.startswith('!items!'):
            item = json.loads(value.decode('utf-8'))
            name = item.get('name', key_str)
            folder_id = item.get('folder')
            folder_name = folder_map.get(folder_id) if folder_id else None
            clean = {
                'type': item.get('type'),
                'system': item.get('system'),
                'folder': folder_name,
            }
            items_data[name] = clean
    db.close()
    
    # Structure with folders at the top
    output = {
        'folders': folders_data,
        'items': items_data,
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def import_pack(pack_path: str, json_path: str):
    # Load system.json for version and id
    with open('system.json', 'r', encoding='utf-8') as f:
        system_data = json.load(f)
    system_id = system_data.get('id', os.path.basename(os.getcwd()))
    system_version = system_data.get('version', '0.6.3')
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if os.path.exists(pack_path):
        import shutil
        shutil.rmtree(pack_path)
    db = plyvel.DB(pack_path, create_if_missing=True)
    now = int(time.time() * 1000)
    
    # Get folders and items from structured format
    folders_data = data.get('folders', {})
    items_data = data.get('items', {})
    
    # Create folder name -> ID mapping
    folder_map = {}
    for folder_name in folders_data.keys():
        folder_map[folder_name] = generate_uid()
    
    with db.write_batch() as wb:
        # Write folder entries with their properties
        for folder_name, folder_props in folders_data.items():
            folder_id = folder_map[folder_name]
            folder_entry = {
                'name': folder_name,
                '_id': folder_id,
                'type': 'Item',
                'sorting': folder_props.get('sorting', 'a'),
                'sort': 0,
                'color': folder_props.get('color'),
                'flags': {},
                '_stats': {
                    'compendiumSource': None,
                    'duplicateSource': None,
                    'exportSource': None,
                    'coreVersion': '13.351',
                    'systemId': system_id,
                    'systemVersion': system_version,
                    'createdTime': now,
                    'modifiedTime': now,
                    'lastModifiedBy': None,
                },
            }
            key = f'!folders!{folder_id}'
            wb.put(key.encode('utf-8'), json.dumps(folder_entry, ensure_ascii=False).encode('utf-8'))
        
        # Write item entries
        for name, item in items_data.items():
            uid = generate_uid()
            folder_name = item.get('folder')
            folder_id = folder_map.get(folder_name) if folder_name else None
            full_item = {
                'name': name,
                'type': item.get('type'),
                '_id': uid,
                'img': 'icons/svg/item-bag.svg',
                'system': item.get('system'),
                'effects': [],
                'folder': folder_id,
                'sort': 0,
                'ownership': {'default': 0},
                'flags': {},
                '_stats': {
                    'compendiumSource': None,
                    'duplicateSource': None,
                    'exportSource': None,
                    'coreVersion': '13.351',
                    'systemId': system_id,
                    'systemVersion': system_version,
                    'createdTime': now,
                    'modifiedTime': now,
                    'lastModifiedBy': None,
                },
            }
            key = f'!items!{uid}'
            wb.put(key.encode('utf-8'), json.dumps(full_item, ensure_ascii=False).encode('utf-8'))
    db.close()


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--import', dest='do_import', action='store_true')
    group.add_argument('--export', dest='do_export', action='store_true')
    parser.add_argument('--json', required=True)
    parser.add_argument('--pack', required=True)
    args = parser.parse_args()

    pack_path = os.path.join('packs', args.pack)

    if args.do_export:
        export_pack(pack_path, args.json)
    else:
        import_pack(pack_path, args.json)


if __name__ == '__main__':
    main()