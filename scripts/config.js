export const GFL5R = {
    namespace: "gfl5r",
    paths: {
        assets: "systems/gfl5r/assets/",
        templates: "systems/gfl5r/templates/",
    },

    // Approaches (replaces L5R5E rings)
    stances: ["power", "precision", "swiftness", "resilience", "fortune"],

    // XP costs
    xp: {
        approachCostMultiplier: 3,  // new_rank × 3
        skillCostMultiplier: 2,     // new_rank × 2
        techniqueCost: 3,           // flat 3 per technique
        disciplineEntryCost: 5,     // flat 5 to pick up a new discipline
    },

    // Discipline progression thresholds (cumulative XP)
    disciplineXPPerRank: [16, 20, 24],
    maxDisciplineSlots: 5,

    // Initiative skills by encounter type
    initiativeSkills: {
        intrigue: "insight",
        duel: "resolve",
        skirmish: "tactics",
        mass_battle: "command",
        chase: "piloting",
        electronic_warfare: "computers",
    },

    // Approach-scoped wounded conditions (lightly/severely per approach)
    conditions: [
        // Wounded conditions first for alignment in token HUD
        {
            id: "lightly_wounded_power",
            name: "gfl5r.conditions.lightly_wounded_power",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_power.webp",
            system: { id: "GFL5RCon000001" }
        },
        {
            id: "lightly_wounded_precision",
            name: "gfl5r.conditions.lightly_wounded_precision",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_precision.webp",
            system: { id: "GFL5RCon000002" }
        },
        {
            id: "lightly_wounded_swiftness",
            name: "gfl5r.conditions.lightly_wounded_swiftness",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_swiftness.webp",
            system: { id: "GFL5RCon000003" }
        },
        {
            id: "lightly_wounded_resilience",
            name: "gfl5r.conditions.lightly_wounded_resilience",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_resilience.webp",
            system: { id: "GFL5RCon000004" }
        },
        {
            id: "lightly_wounded_fortune",
            name: "gfl5r.conditions.lightly_wounded_fortune",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_fortune.webp",
            system: { id: "GFL5RCon000005" }
        },
        {
            id: "severely_wounded_power",
            name: "gfl5r.conditions.severely_wounded_power",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_power.webp",
            system: { id: "GFL5RCon000006" }
        },
        {
            id: "severely_wounded_precision",
            name: "gfl5r.conditions.severely_wounded_precision",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_precision.webp",
            system: { id: "GFL5RCon000007" }
        },
        {
            id: "severely_wounded_swiftness",
            name: "gfl5r.conditions.severely_wounded_swiftness",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_swiftness.webp",
            system: { id: "GFL5RCon000008" }
        },
        {
            id: "severely_wounded_resilience",
            name: "gfl5r.conditions.severely_wounded_resilience",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_resilience.webp",
            system: { id: "GFL5RCon000009" }
        },
        {
            id: "severely_wounded_fortune",
            name: "gfl5r.conditions.severely_wounded_fortune",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_fortune.webp",
            system: { id: "GFL5RCon000010" }
        },
        // Standard conditions
        {
            id: "bleeding",
            name: "gfl5r.conditions.bleeding",
            img: "systems/gfl5r/assets/icons/conditions/bleeding.webp",
            system: { id: "GFL5RCon000011" }
        },
        {
            id: "burning",
            name: "gfl5r.conditions.burning",
            img: "systems/gfl5r/assets/icons/conditions/burning.webp",
            system: { id: "GFL5RCon000012" }
        },
        {
            id: "compromised",
            name: "gfl5r.conditions.compromised",
            img: "systems/gfl5r/assets/icons/conditions/compromised.webp",
            system: { id: "GFL5RCon000013" }
        },
        {
            id: "dazed",
            name: "gfl5r.conditions.dazed",
            img: "systems/gfl5r/assets/icons/conditions/dazed.webp",
            system: { id: "GFL5RCon000014" }
        },
        {
            id: "disoriented",
            name: "gfl5r.conditions.disoriented",
            img: "systems/gfl5r/assets/icons/conditions/disoriented.webp",
            system: { id: "GFL5RCon000015" }
        },
        {
            id: "dying",
            name: "gfl5r.conditions.dying",
            img: "systems/gfl5r/assets/icons/conditions/dying.webp",
            system: { id: "GFL5RCon000016" }
        },
        {
            id: "enraged",
            name: "gfl5r.conditions.enraged",
            img: "systems/gfl5r/assets/icons/conditions/enraged.webp",
            system: { id: "GFL5RCon000017" }
        },
        {
            id: "exhausted",
            name: "gfl5r.conditions.exhausted",
            img: "systems/gfl5r/assets/icons/conditions/exhausted.webp",
            system: { id: "GFL5RCon000018" }
        },
        {
            id: "incapacitated",
            name: "gfl5r.conditions.incapacitated",
            img: "systems/gfl5r/assets/icons/conditions/incapacitated.webp",
            system: { id: "GFL5RCon000019" }
        },
        {
            id: "immobilized",
            name: "gfl5r.conditions.immobilized",
            img: "systems/gfl5r/assets/icons/conditions/immobilized.webp",
            system: { id: "GFL5RCon000020" }
        },
        {
            id: "prone",
            name: "gfl5r.conditions.prone",
            img: "systems/gfl5r/assets/icons/conditions/prone.webp",
            system: { id: "GFL5RCon000021" }
        },
        {
            id: "silenced",
            name: "gfl5r.conditions.silenced",
            img: "systems/gfl5r/assets/icons/conditions/silenced.webp",
            system: { id: "GFL5RCon000022" }
        },
        {
            id: "unconscious",
            name: "gfl5r.conditions.unconscious",
            img: "systems/gfl5r/assets/icons/conditions/unconscious.webp",
            system: { id: "GFL5RCon000023" }
        },
        // Positive conditions
        {
            id: "centered",
            name: "gfl5r.conditions.centered",
            img: "systems/gfl5r/assets/icons/conditions/centered.webp",
            system: { id: "GFL5RCon000024" }
        },
        {
            id: "emboldened",
            name: "gfl5r.conditions.emboldened",
            img: "systems/gfl5r/assets/icons/conditions/emboldened.webp",
            system: { id: "GFL5RCon000025" }
        },
        // ELID stages (humans only)
        {
            id: "elid_stage_1",
            name: "gfl5r.conditions.elid_stage_1",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_1.webp",
            system: { id: "GFL5RCon000026" }
        },
        {
            id: "elid_stage_2",
            name: "gfl5r.conditions.elid_stage_2",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_2.webp",
            system: { id: "GFL5RCon000027" }
        },
        {
            id: "elid_stage_3",
            name: "gfl5r.conditions.elid_stage_3",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_3.webp",
            system: { id: "GFL5RCon000028" }
        },
        // Parapluie stages (T-Dolls only)
        {
            id: "parapluie_stage_1",
            name: "gfl5r.conditions.parapluie_stage_1",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_1.webp",
            system: { id: "GFL5RCon000029" }
        },
        {
            id: "parapluie_stage_2",
            name: "gfl5r.conditions.parapluie_stage_2",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_2.webp",
            system: { id: "GFL5RCon000030" }
        },
        {
            id: "parapluie_stage_3",
            name: "gfl5r.conditions.parapluie_stage_3",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_3.webp",
            system: { id: "GFL5RCon000031" }
        },
        // Vehicle / Chase conditions
        {
            id: "losing_ground",
            name: "gfl5r.conditions.losing_ground",
            img: "systems/gfl5r/assets/icons/conditions/losing_ground.svg",
            system: { id: "GFL5RCon000032" }
        },
    ],
    regex: {
        techniqueDifficulty: /^@([TS]):([^|]+?)(?:\|(min|max)(?:\(([^)]+?)\))?)?$/,
    },
};

// *** Technique Types ***
GFL5R.techniques = new Map();
GFL5R.techniques.set("combat", { type: "core", displayInTypes: true });
GFL5R.techniques.set("command", { type: "core", displayInTypes: true });
GFL5R.techniques.set("conditioning", { type: "core", displayInTypes: true });
GFL5R.techniques.set("electronic_warfare", { type: "core", displayInTypes: true });
GFL5R.techniques.set("remoulding", { type: "core", displayInTypes: true });
GFL5R.techniques.set("science", { type: "core", displayInTypes: true });
GFL5R.techniques.set("social", { type: "core", displayInTypes: true });
GFL5R.techniques.set("street", { type: "core", displayInTypes: true });
GFL5R.techniques.set("vehicle", { type: "core", displayInTypes: true });
GFL5R.techniques.set("perk", { type: "discipline", displayInTypes: false });
GFL5R.techniques.set("capstone", { type: "discipline", displayInTypes: false });

// *** Skills: SkillId -> CategoryId ***
GFL5R.skills = new Map();
// Combat
GFL5R.skills.set("blades", "combat");
GFL5R.skills.set("exotic_weapons", "combat");
GFL5R.skills.set("explosives", "combat");
GFL5R.skills.set("firearms", "combat");
GFL5R.skills.set("hand_to_hand", "combat");
GFL5R.skills.set("tactics", "combat");
// Fieldcraft
GFL5R.skills.set("conditioning", "fieldcraft");
GFL5R.skills.set("resolve", "fieldcraft");
GFL5R.skills.set("crafting", "fieldcraft");
GFL5R.skills.set("insight", "fieldcraft");
GFL5R.skills.set("stealth", "fieldcraft");
GFL5R.skills.set("survival", "fieldcraft");
// Technical
GFL5R.skills.set("computers", "technical");
GFL5R.skills.set("mechanics", "technical");
GFL5R.skills.set("medicine", "technical");
GFL5R.skills.set("piloting", "technical");
GFL5R.skills.set("science", "technical");
GFL5R.skills.set("subterfuge", "technical");
// Social
GFL5R.skills.set("arts", "social");
GFL5R.skills.set("command", "social");
GFL5R.skills.set("culture", "social");
GFL5R.skills.set("deception", "social");
GFL5R.skills.set("negotiation", "social");
GFL5R.skills.set("performance", "social");

// *** Skill Groups (for UI rendering) ***
GFL5R.skillGroups = [
    {
        id: "combat",
        label: "gfl5r.skills.groups.combat",
        skills: ["blades", "exotic_weapons", "explosives", "firearms", "hand_to_hand", "tactics"],
    },
    {
        id: "fieldcraft",
        label: "gfl5r.skills.groups.fieldcraft",
        skills: ["conditioning", "resolve", "crafting", "insight", "stealth", "survival"],
    },
    {
        id: "technical",
        label: "gfl5r.skills.groups.technical",
        skills: ["computers", "mechanics", "medicine", "piloting", "science", "subterfuge"],
    },
    {
        id: "social",
        label: "gfl5r.skills.groups.social",
        skills: ["arts", "command", "culture", "deception", "negotiation", "performance"],
    },
];

// *** Symbols (shortcodes for rich text) ***
GFL5R.symbols = new Map();
GFL5R.symbols.set("(op)", { class: "i_opportunity", label: "gfl5r.dice.chat.opportunities" });
GFL5R.symbols.set("(su)", { class: "i_success", label: "gfl5r.dice.chat.successes" });
GFL5R.symbols.set("(ex)", { class: "i_explosive", label: "gfl5r.dice.chat.explosives" });
GFL5R.symbols.set("(st)", { class: "i_strife", label: "gfl5r.dice.chat.strife" });
GFL5R.symbols.set("(approach)", { class: "i_approach", label: "gfl5r.approaches.title" });
GFL5R.symbols.set("(skill)", { class: "i_skill", label: "gfl5r.skills.title" });

GFL5R.symbols.set("(power)", { class: "i_power", label: "gfl5r.approaches.power" });
GFL5R.symbols.set("(precision)", { class: "i_precision", label: "gfl5r.approaches.precision" });
GFL5R.symbols.set("(swiftness)", { class: "i_swiftness", label: "gfl5r.approaches.swiftness" });
GFL5R.symbols.set("(resilience)", { class: "i_resilience", label: "gfl5r.approaches.resilience" });
GFL5R.symbols.set("(fortune)", { class: "i_fortune", label: "gfl5r.approaches.fortune" });

GFL5R.symbols.set("(combat)", { class: "i_combat", label: "gfl5r.techniques.combat" });
GFL5R.symbols.set("(command)", { class: "i_command", label: "gfl5r.techniques.command" });
GFL5R.symbols.set("(conditioning)", { class: "i_conditioning", label: "gfl5r.techniques.conditioning" });
GFL5R.symbols.set("(ew)", { class: "i_electronic_warfare", label: "gfl5r.techniques.electronic_warfare" });
GFL5R.symbols.set("(remoulding)", { class: "i_remoulding", label: "gfl5r.techniques.remoulding" });
GFL5R.symbols.set("(science)", { class: "i_science", label: "gfl5r.techniques.science" });
GFL5R.symbols.set("(social)", { class: "i_social", label: "gfl5r.techniques.social" });
GFL5R.symbols.set("(street)", { class: "i_street", label: "gfl5r.techniques.street" });
GFL5R.symbols.set("(vehicle)", { class: "i_vehicle", label: "gfl5r.techniques.vehicle" });

// *** Weapon Categories ***
GFL5R.weaponCategories = new Map();
GFL5R.weaponCategories.set("KNF", { label: "gfl5r.weapons.categories.knf", skill: "blades" });
GFL5R.weaponCategories.set("BLD", { label: "gfl5r.weapons.categories.bld", skill: "blades" });
GFL5R.weaponCategories.set("HG", { label: "gfl5r.weapons.categories.hg", skill: "firearms" });
GFL5R.weaponCategories.set("SMG", { label: "gfl5r.weapons.categories.smg", skill: "firearms" });
GFL5R.weaponCategories.set("SG", { label: "gfl5r.weapons.categories.sg", skill: "firearms" });
GFL5R.weaponCategories.set("AR", { label: "gfl5r.weapons.categories.ar", skill: "firearms" });
GFL5R.weaponCategories.set("BR", { label: "gfl5r.weapons.categories.br", skill: "firearms" });
GFL5R.weaponCategories.set("RF", { label: "gfl5r.weapons.categories.rf", skill: "firearms" });
GFL5R.weaponCategories.set("MG", { label: "gfl5r.weapons.categories.mg", skill: "firearms" });

// *** Weapon Qualities ***
GFL5R.weaponQualities = [
    "AOE", "Concealable", "Cumbersome", "Defensive", "Deployable",
    "Durable", "Heavy Barrel", "Mobile", "Compensated", "Scoped",
    "Stationary", "Suppressed",
];

// *** Module Types ***
GFL5R.moduleTypes = [
    "Approach Augmentation",
    "Flash Training",
    "EW Augmentation",
    "Frame Augmentation",
    "Remolding",
];

// *** Narrative Item Types ***
GFL5R.narrativeTypes = ["advantage", "disadvantage", "passion", "anxiety"];

// *** NPC Threat Levels ***
GFL5R.threatLevels = ["minion", "standard", "elite", "boss"];

// *** Source References (compendium content filtering) ***
GFL5R.sourceReference = {};
