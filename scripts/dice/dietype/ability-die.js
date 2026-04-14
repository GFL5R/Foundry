import { Gfl5rBaseDie } from "./gfl5r-base-die.js";

/**
 * GFL5R Skill Die
 */
export class SkillDie extends Gfl5rBaseDie {
    /** @override */
    static DENOMINATION = "s";

    static FACES = {
        1: { success: 0, explosive: 0, opportunity: 0, strife: 0, image: "skill_blank" },
        2: { success: 0, explosive: 0, opportunity: 0, strife: 0, image: "skill_blank" },
        3: { success: 0, explosive: 0, opportunity: 1, strife: 0, image: "skill_o" },
        4: { success: 0, explosive: 0, opportunity: 1, strife: 0, image: "skill_o" },
        5: { success: 0, explosive: 0, opportunity: 1, strife: 0, image: "skill_o" },
        6: { success: 1, explosive: 0, opportunity: 0, strife: 1, image: "skill_st" },
        7: { success: 1, explosive: 0, opportunity: 0, strife: 1, image: "skill_st" },
        8: { success: 1, explosive: 0, opportunity: 0, strife: 0, image: "skill_s" },
        9: { success: 1, explosive: 0, opportunity: 0, strife: 0, image: "skill_s" },
        10: { success: 1, explosive: 0, opportunity: 1, strife: 0, image: "skill_so" },
        11: { success: 0, explosive: 1, opportunity: 0, strife: 1, image: "skill_et" },
        12: { success: 0, explosive: 1, opportunity: 0, strife: 0, image: "skill_e" },
    };

    /** @override */
    constructor(termData) {
        super(termData);
        this.faces = 12;
    }
}
