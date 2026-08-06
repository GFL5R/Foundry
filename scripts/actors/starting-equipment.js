/**
 * Starting equipment grants at character creation.
 * Mirrors webapp/src/data/starting-equipment.js for Foundry character generator.
 */

// ---------------------------------------------------------------------------
// Nationality → item names (flavorful, mundane, survival/identity gear)
// ---------------------------------------------------------------------------
export const NATIONALITY_ITEMS = {
  "fsa":                  ["Duct Tape", "Road Flare", "Pocket Knife"],
  "ara":                  ["Ration Brick", "Multitool", "Sturdy Boots"],
  "neo-soviet-union":     ["Canteen", "Disposable Lighter", "Paracord"],
  "china":                ["Compass", "Ration Brick", "Bottled Water"],
  "latin-america":        ["Flashlight", "Zip Ties", "Hard Candy"],
  "japan":                ["Chemlight", "Basic Medical Supplies"],
  "pan-europe":           ["Binoculars", "Pocket Knife"],
  "yugoslavian-federation": ["Disposable Lighter", "Pack of Cigarettes", "Duct Tape"],
  "north-african-union":  ["Canteen", "Sleeping Bag", "Road Flare"],
  "australia":            ["Compass", "Sleeping Bag", "Hard Candy"],
  "yellow-zone":          ["Gas Mask", "Bottled Water", "Paracord"],
}

// ---------------------------------------------------------------------------
// Background → { items: string[], armor: string | null }
// ---------------------------------------------------------------------------
export const BACKGROUND_GEAR = {
  "military": {
    items: ["Basic Medical Supplies", "Flashlight"],
    armor: "Tactical Vest",
  },
  "pmc-commander": {
    items: ["Binoculars", "Paracord"],
    armor: "Concealable Vest",
  },
  "corporate-drone": {
    items: ["Multitool", "Zip Ties"],
    armor: null,
  },
  "scavenger": {
    items: ["Crowbar", "Duct Tape", "Road Flare"],
    armor: null,
  },
  "technician": {
    items: ["Multitool", "Duct Tape", "Chemlight"],
    armor: null,
  },
  "medic": {
    items: ["Medical Kit", "Paracord"],
    armor: null,
  },
  "criminal": {
    items: ["Lock Picking Set", "Zip Ties"],
    armor: null,
  },
  "scholar": {
    items: ["Compass", "Journal and Pen", "Bottled Water"],
    armor: null,
  },
}

// ---------------------------------------------------------------------------
// Discipline → { category: string, maxPrice: number }
// Fallback only: the canonical grant lives on the discipline item itself
// (system.starting_weapon). Used when the item carries no grant data.
// ---------------------------------------------------------------------------
export const DISCIPLINE_WEAPON_GRANTS = {
  // Commander disciplines
  "Ghost":              { category: "HG",  maxPrice: 1700 },
  "Sicario":            { category: "HG",  maxPrice: 1700 },
  "Street Kid":         { category: "KNF", maxPrice: 1500 },
  "Heartbreaker":       { category: "HG",  maxPrice: 1700 },
  "Smooth Talker":      { category: "HG",  maxPrice: 1700 },
  "Commander":          { category: "HG",  maxPrice: 1700 },
  "Black Hat":          { category: "HG",  maxPrice: 1700 },
  "Spider":             { category: "HG",  maxPrice: 1700 },
  "Knuckle Dragger":    { category: "HG",  maxPrice: 1700 },
  "Analyst":            { category: "HG",  maxPrice: 1700 },
  "Field Medic":        { category: "HG",  maxPrice: 1700 },
  "Grease Monkey":      { category: "HG",  maxPrice: 1700 },
  "Frontliner":         { category: "SHD", maxPrice: 2500 },
  "Baby Driver":        { category: "HG",  maxPrice: 1700 },
  "Chauffeur":          { category: "HG",  maxPrice: 1700 },

  // T-Doll weapon disciplines
  "Knives":             { category: "KNF", maxPrice: 1500 },
  "Swords":             { category: "BLD", maxPrice: 1500 },
  "Pistols":            { category: "HG",  maxPrice: 1700 },
  "Submachine Guns":    { category: "SMG", maxPrice: 2000 },
  "Shotguns":           { category: "SG",  maxPrice: 2400 },
  "Assault Rifles":     { category: "AR",  maxPrice: 1950 },
  "Battle Rifles":      { category: "BR",  maxPrice: 1800 },
  "Snipers":            { category: "RF",  maxPrice: 2600 },
  "Machine Guns":       { category: "MG",  maxPrice: 1750 },
}