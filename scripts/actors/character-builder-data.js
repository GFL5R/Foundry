/**
 * Character creation data tables.
 * Ported from old-gfl5r-foundry/module/actor-data.js.
 */

export const HUMAN_NATIONALITIES = [
    { key: "fsa", label: "Free States of America (FSA)", approaches: ["swiftness", "power"] },
    { key: "ara", label: "American Rossartrist Alliance", approaches: ["resilience", "precision"] },
    { key: "neo-soviet-union", label: "Neo-Soviet Union (NUSSR)", approaches: ["resilience", "power"] },
    { key: "china", label: "China", approaches: ["precision", "fortune"] },
    { key: "latin-america", label: "Latin America Alliance", approaches: ["precision", "power"] },
    { key: "japan", label: "Japan", approaches: ["resilience", "swiftness"] },
    { key: "pan-europe", label: "Pan-European Union", approaches: ["precision", "swiftness"] },
    { key: "yugoslavian-federation", label: "Yugoslavian Federation", approaches: ["fortune", "swiftness"] },
    { key: "north-african-union", label: "North African Union", approaches: ["precision", "resilience"] },
    { key: "australia", label: "Australia", approaches: ["fortune", "resilience"] },
    { key: "yellow-zone", label: "Yellow Zone Native", approaches: ["fortune", "power"] },
];

export const HUMAN_BACKGROUNDS = [
    { key: "military", label: "Military", approach: "resilience", skill: "tactics" },
    { key: "pmc-commander", label: "PMC Commander", approach: "power", skill: "command" },
    { key: "corporate-drone", label: "Corporate Drone", approach: "precision", skill: "negotiation" },
    { key: "scavenger", label: "Scavenger", approach: "swiftness", skill: "survival" },
    { key: "technician", label: "Technician", approach: "precision", skill: "mechanics" },
    { key: "medic", label: "Medic", approach: "resilience", skill: "medicine" },
    { key: "criminal", label: "Criminal", approach: "fortune", skill: "stealth" },
    { key: "scholar", label: "Scholar", approach: "swiftness", skill: "computers" },
];

export const TDOLL_FRAMES = [
    {
        key: "iop-ssd62",
        manufacturer: "IOP (Kyiv, Ukraine)",
        model: "SSD-62",
        description: "A true all-rounder frame with no major weaknesses, but no standout strengths either. Reliable in most situations, yet rarely the best choice when specialization matters.",
        approaches: { power: 2, swiftness: 2, resilience: 2, precision: 2, fortune: 2 },
        skills: ["firearms", "negotiation"],
    },
    {
        key: "iop-sst05",
        manufacturer: "IOP (Kyiv, Ukraine)",
        model: "SST-05",
        description: "Built for aggressive frontline work, excelling at mobility and direct combat. Effective under fire, but has less capacity for neural data.",
        approaches: { power: 3, swiftness: 3, resilience: 2, precision: 1, fortune: 1 },
        skills: ["firearms", "tactics"],
    },
    {
        key: "iop-ppd02",
        manufacturer: "16LAB (Kyiv, Ukraine)",
        model: "PPD-02",
        description: "A high-performance test platform tuned for perception and rapid response. Exceptional at analysis and precise action, but physically weaker than its counterparts.",
        approaches: { power: 1, swiftness: 3, resilience: 2, precision: 3, fortune: 1 },
        skills: ["firearms", "insight"],
    },
    {
        key: "svarog-crar",
        manufacturer: "Svarog Heavy Industries (Moscow, Russia)",
        model: "CRAR",
        description: "An industrial heavyweight that thrives on raw strength and armor. Extremely durable and powerful, yet slow to reposition and poorly suited to delicate or fast-paced tasks.",
        approaches: { power: 3, swiftness: 1, resilience: 3, precision: 2, fortune: 1 },
        skills: ["conditioning", "mechanics"],
    },
    {
        key: "svarog-dmtx",
        manufacturer: "Svarog Heavy Industries (Moscow, Russia)",
        model: "DMT-X",
        description: "A support-oriented frame optimized for careful, technical work in hazardous conditions. Highly precise and tough, but lacking speed and offensive capability.",
        approaches: { power: 1, swiftness: 1, resilience: 3, precision: 3, fortune: 2 },
        skills: ["mechanics", "medicine"],
    },
    {
        key: "sangvis-dsi8",
        manufacturer: "Sangvis Ferri (Romania)",
        model: "DSI-8",
        description: "Designed for infiltration, balancing mobility and precision for covert operations. Though it falters in prolonged or brute-force engagements.",
        approaches: { power: 1, swiftness: 1, resilience: 2, precision: 3, fortune: 3 },
        skills: ["stealth", "subterfuge"],
    },
    {
        key: "sangvis-sp",
        manufacturer: "Sangvis Ferri (Romania)",
        model: "SP series",
        description: "A command-oriented security frame suited to coordination and oversight roles. Competent and dependable, but lacks toughness.",
        approaches: { power: 2, swiftness: 2, resilience: 1, precision: 3, fortune: 2 },
        skills: ["insight", "command"],
    },
];
