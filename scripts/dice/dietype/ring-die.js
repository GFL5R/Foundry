import { Gfl5rBaseDie } from "./gfl5r-base-die.js";

/**
 * GFL5R Approach Die (d6)
 */
export class ApproachDie extends Gfl5rBaseDie {
    /** @override */
    static DENOMINATION = "a";

    static FACES = {
        1: { success: 0, explosive: 0, opportunity: 0, strife: 0, image: "ring_blank" },
        2: { success: 0, explosive: 0, opportunity: 1, strife: 1, image: "ring_ot" },
        3: { success: 0, explosive: 0, opportunity: 1, strife: 0, image: "ring_o" },
        4: { success: 1, explosive: 0, opportunity: 0, strife: 1, image: "ring_st" },
        5: { success: 1, explosive: 0, opportunity: 0, strife: 0, image: "ring_s" },
        6: { success: 0, explosive: 1, opportunity: 0, strife: 1, image: "ring_et" },
    };

    /** @override */
    constructor(termData) {
        super(termData);
        this.faces = 6;
    }
}
