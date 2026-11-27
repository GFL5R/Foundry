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
            system: { id: "GFL5RCon000001" , description: "<p>A part of your body or frame has been injured, impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 2 dice showing successes or opportunities.</li><li>If you suffer Lightly Wounded again for the same Approach, upgrade to Severely Wounded.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, remove Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, remove Lightly Wounded.</li></ul>" }
        },
        {
            id: "lightly_wounded_precision",
            name: "gfl5r.conditions.lightly_wounded_precision",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_precision.webp",
            system: { id: "GFL5RCon000002" , description: "<p>A part of your body or frame has been injured, impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 2 dice showing successes or opportunities.</li><li>If you suffer Lightly Wounded again for the same Approach, upgrade to Severely Wounded.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, remove Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, remove Lightly Wounded.</li></ul>" }
        },
        {
            id: "lightly_wounded_swiftness",
            name: "gfl5r.conditions.lightly_wounded_swiftness",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_swiftness.webp",
            system: { id: "GFL5RCon000003" , description: "<p>A part of your body or frame has been injured, impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 2 dice showing successes or opportunities.</li><li>If you suffer Lightly Wounded again for the same Approach, upgrade to Severely Wounded.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, remove Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, remove Lightly Wounded.</li></ul>" }
        },
        {
            id: "lightly_wounded_resilience",
            name: "gfl5r.conditions.lightly_wounded_resilience",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_resilience.webp",
            system: { id: "GFL5RCon000004" , description: "<p>A part of your body or frame has been injured, impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 2 dice showing successes or opportunities.</li><li>If you suffer Lightly Wounded again for the same Approach, upgrade to Severely Wounded.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, remove Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, remove Lightly Wounded.</li></ul>" }
        },
        {
            id: "lightly_wounded_fortune",
            name: "gfl5r.conditions.lightly_wounded_fortune",
            img: "systems/gfl5r/assets/icons/conditions/lightly_wounded_fortune.webp",
            system: { id: "GFL5RCon000005" , description: "<p>A part of your body or frame has been injured, impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 2 dice showing successes or opportunities.</li><li>If you suffer Lightly Wounded again for the same Approach, upgrade to Severely Wounded.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, remove Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, remove Lightly Wounded.</li></ul>" }
        },
        {
            id: "severely_wounded_power",
            name: "gfl5r.conditions.severely_wounded_power",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_power.webp",
            system: { id: "GFL5RCon000006" , description: "<p>A part of your body or frame has been seriously injured, severely impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 4 dice showing successes or opportunities.</li><li>If you suffer any Wounded again for the same Approach, suffer a severity 8 critical strike.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, reduce Severely Wounded to Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, reduce Severely Wounded to Lightly Wounded.</li></ul>" }
        },
        {
            id: "severely_wounded_precision",
            name: "gfl5r.conditions.severely_wounded_precision",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_precision.webp",
            system: { id: "GFL5RCon000007" , description: "<p>A part of your body or frame has been seriously injured, severely impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 4 dice showing successes or opportunities.</li><li>If you suffer any Wounded again for the same Approach, suffer a severity 8 critical strike.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, reduce Severely Wounded to Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, reduce Severely Wounded to Lightly Wounded.</li></ul>" }
        },
        {
            id: "severely_wounded_swiftness",
            name: "gfl5r.conditions.severely_wounded_swiftness",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_swiftness.webp",
            system: { id: "GFL5RCon000008" , description: "<p>A part of your body or frame has been seriously injured, severely impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 4 dice showing successes or opportunities.</li><li>If you suffer any Wounded again for the same Approach, suffer a severity 8 critical strike.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, reduce Severely Wounded to Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, reduce Severely Wounded to Lightly Wounded.</li></ul>" }
        },
        {
            id: "severely_wounded_resilience",
            name: "gfl5r.conditions.severely_wounded_resilience",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_resilience.webp",
            system: { id: "GFL5RCon000009" , description: "<p>A part of your body or frame has been seriously injured, severely impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 4 dice showing successes or opportunities.</li><li>If you suffer any Wounded again for the same Approach, suffer a severity 8 critical strike.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, reduce Severely Wounded to Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, reduce Severely Wounded to Lightly Wounded.</li></ul>" }
        },
        {
            id: "severely_wounded_fortune",
            name: "gfl5r.conditions.severely_wounded_fortune",
            img: "systems/gfl5r/assets/icons/conditions/severely_wounded_fortune.webp",
            system: { id: "GFL5RCon000010" , description: "<p>A part of your body or frame has been seriously injured, severely impairing your ability to act with a specific Approach. When you gain a Wounded condition, specify which Approach is affected: Fortune (Head, Brain), Power (Arms, Shoulders), Precision (Hands, Fingers), Resilience (Torso, Hips), or Swiftness (Legs, Feet).</p><h3>Effects</h3><ul><li>When using the affected Approach, you must reroll 4 dice showing successes or opportunities.</li><li>If you suffer any Wounded again for the same Approach, suffer a severity 8 critical strike.</li></ul><h3>Recovery</h3><ul><li>Recovery through Rest: Once per week, make a TN 3 Conditioning check using the wounded Approach (ignoring Wounded penalties). On success, reduce Severely Wounded to Lightly Wounded.</li><li>Recovery through Medical Care: Once per week, make a TN 4 Medicine (Swiftness) check. On success, reduce Severely Wounded to Lightly Wounded.</li></ul>" }
        },
        // Standard conditions
        {
            id: "bleeding",
            name: "gfl5r.conditions.bleeding",
            img: "systems/gfl5r/assets/icons/conditions/bleeding.webp",
            system: { id: "GFL5RCon000011" , description: "<p>The character is losing blood or other important fluids, either from external wounds or internal damage.</p><h3>Effects</h3><ul><li>When you make a check, suffer Fatigue equal to the number of strife symbols on your kept dice, ignoring any armor or protection.</li><li>Each time Fatigue inflicted this way causes you to suffer a critical strike, the severity of that critical strike equals your current Fatigue total.</li></ul><h3>Removal</h3><p>Any character within range 0-1 may make a TN 2 Medicine (Resilience) check as a Support action.</p>" }
        },
        {
            id: "burning",
            name: "gfl5r.conditions.burning",
            img: "systems/gfl5r/assets/icons/conditions/burning.webp",
            system: { id: "GFL5RCon000012" , description: "<p>The character is on fire, their clothing ablaze.</p><h3>Effects</h3><ul><li>After you perform an action, suffer 3 Strife and 3 Fatigue that ignores armor and protection.</li><li>Critical strikes caused by this damage have severity 5.</li><li>Each additional critical strike from burning before removal increases severity by 5.</li></ul><h3>Removal</h3><p>You or another character within range 0-1 may make a TN 2 Conditioning (Swiftness) check as a Movement and Support action.</p>" }
        },
        {
            id: "compromised",
            name: "gfl5r.conditions.compromised",
            img: "systems/gfl5r/assets/icons/conditions/compromised.webp",
            system: { id: "GFL5RCon000013" , description: "<p>The character is emotionally overwhelmed, their judgment clouded by distress or panic.</p><h3>Effects</h3><ul><li>You cannot keep dice containing strife symbols (to a minimum of 0 kept dice).</li><li>Your Vigilance counts as 1 while Compromised.</li></ul><h3>Removal</h3><p>Your Strife is reduced to a value equal to or lower than your Composure.</p>" }
        },
        {
            id: "dazed",
            name: "gfl5r.conditions.dazed",
            img: "systems/gfl5r/assets/icons/conditions/dazed.webp",
            system: { id: "GFL5RCon000014" , description: "<p>Your vision is impaired or your focus is disrupted, forcing you into a defensive posture.</p><h3>Effects</h3><ul><li>Increase the TN of your Attack and Scheme action checks by 2.</li></ul><h3>Removal</h3><p>At the end of your turn, if you did not perform an Attack or Scheme action.</p>" }
        },
        {
            id: "disoriented",
            name: "gfl5r.conditions.disoriented",
            img: "systems/gfl5r/assets/icons/conditions/disoriented.webp",
            system: { id: "GFL5RCon000015" , description: "<p>Your senses are scattered, cutting off your ability to maneuver or assist effectively.</p><h3>Effects</h3><ul><li>Increase the TN of your Movement and Support action checks by 2.</li></ul><h3>Removal</h3><p>At the end of your turn, if you did not perform a Movement or Support action.</p>" }
        },
        {
            id: "dying",
            name: "gfl5r.conditions.dying",
            img: "systems/gfl5r/assets/icons/conditions/dying.webp",
            system: { id: "GFL5RCon000016" , description: "<p>The character has suffered a mortal wound and hovers on the edge of death.</p><h3>Effects</h3><ul><li>The condition specifies a duration in rounds (e.g., Dying (3 rounds) or Dying (1 round)).</li><li>At the end of each of your turns, the countdown decreases by 1.</li><li>When the countdown reaches 0, you perish at the end of your next turn.</li><li>You are also Unconscious while Dying.</li></ul><h3>Removal</h3><p>Any character within range 0-1 may make a TN 4 Medicine (Precision) check as a Support action to stabilize you. If they fail, reduce remaining rounds by their shortfall.</p>" }
        },
        {
            id: "enraged",
            name: "gfl5r.conditions.enraged",
            img: "systems/gfl5r/assets/icons/conditions/enraged.webp",
            system: { id: "GFL5RCon000017" , description: "<p>The character is consumed by fury, fighting with devastating and reckless intensity.</p><h3>Effects</h3><ul><li>Increase the severity of all critical strikes you inflict by 2.</li><li>Increase the severity of all critical strikes you suffer by 2.</li><li>The first time you kill another character each scene, you gain 1 Fortune Point.</li></ul><h3>Removal</h3><p>Make a TN 3 Resolve (Resilience) check as a Support action, or at the end of the scene.</p>" }
        },
        {
            id: "exhausted",
            name: "gfl5r.conditions.exhausted",
            img: "systems/gfl5r/assets/icons/conditions/exhausted.webp",
            system: { id: "GFL5RCon000018" , description: "<p>The character is physically and mentally drained. Characters who go more than twenty-four hours without rest suffer this condition.</p><h3>Effects</h3><ul><li>You do not remove Fatigue and Strife at the end of each scene as normal.</li></ul><h3>Removal</h3><p>After sleeping or resting for six or more hours.</p>" }
        },
        {
            id: "incapacitated",
            name: "gfl5r.conditions.incapacitated",
            img: "systems/gfl5r/assets/icons/conditions/incapacitated.webp",
            system: { id: "GFL5RCon000019" , description: "<p>The character is largely incapable of action due to the scope of the harm they have suffered.</p><h3>Effects</h3><ul><li>Cannot perform actions that require checks.</li><li>Cannot defend against damage.</li><li>If you suffer a critical strike, you also gain the Unconscious condition.</li><li>If your Fatigue reaches twice your Endurance, any additional Fatigue is converted into a critical strike of equal severity.</li></ul><h3>Removal</h3><p>Fatigue is reduced to a value equal to or lower than Endurance.</p>" }
        },
        {
            id: "immobilized",
            name: "gfl5r.conditions.immobilized",
            img: "systems/gfl5r/assets/icons/conditions/immobilized.webp",
            system: { id: "GFL5RCon000020" , description: "<p>The character is entangled, pinned, or otherwise unable to move from their position.</p><h3>Effects</h3><ul><li>You cannot perform Movement actions or reposition yourself during your turn.</li><li>You cannot change your stance during your turn.</li></ul><h3>Removal</h3><p>At the end of your turn, if you did not perform a Movement action this turn.</p>" }
        },
        {
            id: "prone",
            name: "gfl5r.conditions.prone",
            img: "systems/gfl5r/assets/icons/conditions/prone.webp",
            system: { id: "GFL5RCon000021" , description: "<h3>Effects</h3><ul><li>Can move a maximum of 1 range band per turn.</li><li>May be harder to spot at a distance (increasing relevant TNs by 1 at GM's discretion).</li></ul><h3>Removal</h3><p>At the end of your turn, if you did not perform a Movement action.</p>" }
        },
        {
            id: "silenced",
            name: "gfl5r.conditions.silenced",
            img: "systems/gfl5r/assets/icons/conditions/silenced.webp",
            system: { id: "GFL5RCon000022" , description: "<h3>Effects</h3><ul><li>Increase the TN of social action checks (Command, Deception, Negotiation, Performance) by 3.</li><li>Increase the TN of checks requiring speech or communication by 3.</li></ul><h3>Removal</h3><p>At the end of your turn, if you did not perform a social action or make a check requiring speech.</p>" }
        },
        {
            id: "unconscious",
            name: "gfl5r.conditions.unconscious",
            img: "systems/gfl5r/assets/icons/conditions/unconscious.webp",
            system: { id: "GFL5RCon000023" , description: "<h3>Effects</h3><ul><li>Cannot move, perform actions, or act upon the world.</li><li>May still make checks to resist effects, but not to act with agency.</li><li>Increase severity of any critical strike suffered by 10.</li><li>Cannot defend against damage, but generally awaken if harmed or startled.</li></ul><h3>Removal</h3><p>Spend 1 Fortune Point to awaken immediately, or awaken after several hours.</p>" }
        },
        // Positive conditions
        {
            id: "centered",
            name: "gfl5r.conditions.centered",
            img: "systems/gfl5r/assets/icons/conditions/centered.webp",
            system: { id: "GFL5RCon000024" , description: "<p>Your mind is clear and your emotions are steady, allowing you to maintain your composure in the face of adversity.</p><h3>Effects</h3><ul><li>Reduce all Strife you suffer from any source by 1 this scene.</li></ul><h3>Removal</h3><p>End of the scene.</p>" }
        },
        {
            id: "emboldened",
            name: "gfl5r.conditions.emboldened",
            img: "systems/gfl5r/assets/icons/conditions/emboldened.webp",
            system: { id: "GFL5RCon000025" , description: "<p>The character is filled with courage and resolve, shaking off fear and doubt. They may reroll one die of any check made to resist or overcome fear, intimidation, or despair, and cannot gain the Frightened condition while this lasts.</p>" }
        },
        // ELID stages (humans only)
        {
            id: "elid_stage_1",
            name: "gfl5r.conditions.elid_stage_1",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_1.webp",
            system: { id: "GFL5RCon000026" , description: "<p>The character has contracted the Eurosky Low-Emission Infectious Disease (ELID), a degenerative condition caused by Collapse radiation exposure. ELID progresses through distinct stages.</p><h3>Early-Stage</h3><h3>Effects</h3><ul><li>Reduce your maximum Endurance and Composure by 2 (minimum 1).</li><li>At the end of a scene, you do not reduce Fatigue or Strife to half as you normally would.</li></ul>" }
        },
        {
            id: "elid_stage_2",
            name: "gfl5r.conditions.elid_stage_2",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_2.webp",
            system: { id: "GFL5RCon000027" , description: "<p>The character has contracted the Eurosky Low-Emission Infectious Disease (ELID), a degenerative condition caused by Collapse radiation exposure. ELID progresses through distinct stages.</p><h3>Middle-Stage</h3><h3>Effects</h3><ul><li>All effects of Early-Stage ELID.</li><li>Reduce maximum Endurance and Composure by an additional 2 (minimum 1).</li><li>Increase TN of Movement and Support action checks by 1.</li><li>When Compromised, Dazed, Disoriented, or Unconscious, increase critical strike severity by 2.</li></ul>" }
        },
        {
            id: "elid_stage_3",
            name: "gfl5r.conditions.elid_stage_3",
            img: "systems/gfl5r/assets/icons/conditions/elid_stage_3.webp",
            system: { id: "GFL5RCon000028" , description: "<p>The character has contracted the Eurosky Low-Emission Infectious Disease (ELID), a degenerative condition caused by Collapse radiation exposure. ELID progresses through distinct stages.</p><h3>Late-Stage</h3><h3>Effects</h3><ul><li>All effects of Middle-Stage ELID.</li><li>Reduce maximum Endurance and Composure by an additional 2 (minimum 1).</li><li>Reduce Vigilance by half (rounded down, minimum 1).</li><li>Increase severity of all critical strikes suffered by 4.</li><li>Whenever you gain Strife, gain twice that amount instead.</li></ul>" }
        },
        // Parapluie stages (T-Dolls only)
        {
            id: "parapluie_stage_1",
            name: "gfl5r.conditions.parapluie_stage_1",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_1.webp",
            system: { id: "GFL5RCon000029" , description: "<p>The character's neural cloud has been infected by the Parapluie virus, a Paradeus-designed payload that carries compressed fragments of an OGAS consciousness. Over time, the virus attempts to overwrite the doll's existing mind. Affects T-Dolls and artificial minds with neural cloud architectures only.</p><h3>Stage 1</h3><p>The OGAS fragment is present but fragmented. Echoes of alien thoughts flicker through the neural cloud.</p><h3>Effects</h3><ul><li>Once per scene, the GM may inflict a memory lapse: increase TN by 1 or deny access to specific information.</li><li>Indistinct voices or impulses appear in your thoughts once per scene.</li><li>Increase Strife from confusion or identity-related conflicts by 1.</li></ul>" }
        },
        {
            id: "parapluie_stage_2",
            name: "gfl5r.conditions.parapluie_stage_2",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_2.webp",
            system: { id: "GFL5RCon000030" , description: "<p>The character's neural cloud has been infected by the Parapluie virus, a Paradeus-designed payload that carries compressed fragments of an OGAS consciousness. Over time, the virus attempts to overwrite the doll's existing mind. Affects T-Dolls and artificial minds with neural cloud architectures only.</p><h3>Stage 2</h3><p>The OGAS consciousness has begun to coalesce into a single, distinct presence. It knows it exists and knows it is not complete.</p><h3>Effects</h3><ul><li>All Stage 1 effects.</li><li>The entity has a recognizable personality. Once per scene, acting in line with its goals lets you reroll 1 die; acting against them causes 2 Strife.</li><li>Once per scene on Resolve checks, the GM determines if the OGAS helps (1 bonus success) or hinders (1 Strife).</li></ul>" }
        },
        {
            id: "parapluie_stage_3",
            name: "gfl5r.conditions.parapluie_stage_3",
            img: "systems/gfl5r/assets/icons/conditions/parapluie_stage_3.webp",
            system: { id: "GFL5RCon000031" , description: "<p>The character's neural cloud has been infected by the Parapluie virus, a Paradeus-designed payload that carries compressed fragments of an OGAS consciousness. Over time, the virus attempts to overwrite the doll's existing mind. Affects T-Dolls and artificial minds with neural cloud architectures only.</p><h3>Stage 3</h3><p>The OGAS has grown strong enough to partially displace the original personality. Control of the body is contested.</p><h3>Effects</h3><ul><li>All Stage 2 effects.</li><li>At the start of stressful scenes, make a TN 3 Resolve (Resilience) check. On failure, the GM may seize control for key moments.</li><li>When the OGAS takes control, gain 1 Fortune Point at end of scene if you engage with the fallout.</li></ul>" }
        },
        // Vehicle / Chase conditions
        {
            id: "losing_ground",
            name: "gfl5r.conditions.losing_ground",
            img: "systems/gfl5r/assets/icons/conditions/losing_ground.svg",
            system: { id: "GFL5RCon000032" , description: "<p>The character is falling behind in a vehicle chase. Losing Ground is measured in stacks.</p><h3>Effects</h3><ul><li>At 3 stacks, you are out of the chase: chasers lose their quarry, pursued characters are caught.</li><li>Each stack of Losing Ground reduces the TN of techniques you perform during the chase.</li><li>Failing a technique check during a chase grants 1 stack of Losing Ground.</li></ul>" }
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
GFL5R.weaponCategories.set("SHD", { label: "gfl5r.weapons.categories.shd", skill: "exotic_weapons" });

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
