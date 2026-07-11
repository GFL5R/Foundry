/**
 * GFL5R Base Die
 */
export class Gfl5rBaseDie extends foundry.dice.terms.DiceTerm {
    /** Need to be overridden */
    static DENOMINATION = "";

    /** Need to be overridden */
    static FACES = {};

    /** @override */
    constructor(termData) {
        super(termData);
        this.gfl5r = { success: 0, explosive: 0, opportunity: 0, strife: 0 };
    }

    /**
     * Return the total number of success + explosives
     * @returns {number}
     */
    get totalSuccess() {
        return this.gfl5r.success + this.gfl5r.explosive;
    }

    /**
     * A string representation of the formula expression for this RollTerm, prior to evaluation.
     * @type {string}
     * @override
     */
    get expression() {
        return `${this.number}d${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
    }

    /**
     * Return a standardized representation for the displayed formula associated with this DiceTerm
     * @return {string}
     * @override
     */
    get formula() {
        // No flavor
        return this.expression;
    }

    /**
     * Return a string used as the label for each rolled result
     * @param {DiceTermResult} result     The rolled result
     * @return {string}                   The result label
     */
    getResultLabel(result) {
        return `<img src="${CONFIG.gfl5r.paths.assets}dices/default/${
            this.constructor.FACES[result.result].image
        }.svg" alt="${result.result}" />`;
    }

    /**
     * Return the url of the result face
     * @param {string|number} result
     * @return {string}
     */
    static getResultSrc(result) {
        return `${CONFIG.gfl5r.paths.assets}dices/default/${this.FACES[result].image}.svg`;
    }

    /**
     * Return the total result of the DiceTerm if it has been evaluated
     * Always zero for L5R dices to not count in total for regular dices
     * @override
     * @return {number|string}
     */
    get total() {
        return 0;
    }

    /**
     * Evaluate the term, processing its inputs and finalizing its total.
     * @param  {boolean} minimize      Minimize the result, obtaining the smallest possible value.
     * @param  {boolean} maximize      Maximize the result, obtaining the largest possible value.
     * @param  {boolean} async         Evaluate the term asynchronously, receiving a Promise as the returned value. This will become the default behavior in version 10.x
     * @return {Gfl5rBaseDie}            The evaluated RollTerm
     * @override
     */
    async evaluate({ minimize = false, maximize = false } = {}) {
        if (this._evaluated) {
            throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
        }

        // Roll the initial number of dice
        for (let n = 1; n <= this.number; n++) {
            await this.roll({ minimize, maximize });
        }

        // Apply modifiers
        this._evaluateModifiers();

        // Combine all results
        this.gfl5rSummary();

        // Return the evaluated term
        this._evaluated = true;
        this.result = 0;

        return this;
    }

    /**
     * Summarise the total of success, strife... for GFL5R dices for the current Die
     */
    gfl5rSummary() {
        this.gfl5r = { success: 0, explosive: 0, opportunity: 0, strife: 0 };
        this.results.forEach((term) => {
            const face = this.constructor.FACES[term.result];
            ["success", "explosive", "opportunity", "strife"].forEach((props) => {
                this.gfl5r[props] += parseInt(face[props]);
            });
            if (face.explosive) {
                term.exploded = true;
            }
        });
    }

    /**
     * Roll the DiceTerm by mapping a random uniform draw against the faces of the dice term
     * @param {Object} options
     * @return {DiceTermResult}
     * @override
     */
    roll(options = { minimize: false, maximize: false }) {
        const roll = super.roll(options);
        //roll.gfl5r = this.gfl5r;
        return roll;
    }

    /**
     * Construct a DiceTerm from a provided data object
     * @param {object} data  Provided data from an un-serialized term
     * @return {DiceTerm}    The constructed RollTerm
     * @override
     */
    static fromData(data) {
        const roll = super.fromData(data);
        roll.gfl5r = data.gfl5r;
        return roll;
    }

    /**
     * Represent the data of the DiceTerm as an object suitable for JSON serialization
     * @return {string}
     * @override
     */
    toJSON() {
        const json = super.toJSON();
        json.gfl5r = this.gfl5r;
        return json;
    }
}
