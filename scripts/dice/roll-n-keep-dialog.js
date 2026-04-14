/**
 * L5R Dice Roll n Keep dialog
 * @extends {FormApplication}
 */
export class RollnKeepDialog extends FormApplication {
    /**
     * Player choice list
     */
    static CHOICES = {
        discard: "discard",
        keep: "keep",
        nothing: null,
        reroll: "reroll",
        // reserve: "reserve",
        swap: "swap",
    };

    /**
     * The current ChatMessage where we come from
     * @param {ChatMessage} message
     */
    _message = null;

    /**
     * The current Roll
     * @param {RollGfl5r} roll
     */
    roll = null;

    /**
     * Payload Object
     */
    object = {
        currentStep: 0,
        strifeApplied: 0,
        submitDisabled: false,
        swapDiceFaces: {
            rings: [],
            skills: [],
        },
        dicesList: [[]],
    };

    /**
     * Assign the default options
     * @override
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "gfl5r-roll-n-keep-dialog",
            classes: ["gfl5r", "roll-n-keep-dialog"],
            template: CONFIG.gfl5r.paths.templates + "dice/roll-n-keep-dialog.html",
            title: game.i18n.localize("gfl5r.dice.roll_n_keep.title"),
            closeOnSubmit: false,
        });
    }

    /**
     * Define a unique and dynamic element ID for the rendered application
     */
    get id() {
        return `gfl5r-roll-n-keep-dialog-${this._message.id}`;
    }

    /**
     * ChatMessage
     * @param {ChatMessage} msg
     */
    set message(msg) {
        this._message = msg instanceof ChatMessage ? msg : null;
    }

    /**
     * ChatMessage
     * @returns {ChatMessage}
     */
    get message() {
        return this._message;
    }

    /**
     * Current (first) Roll in ChatMessage
     * @returns {RollGfl5r}
     */
    get messageRoll() {
        return this._message?.rolls?.[0] || null;
    }

    /**
     * Return true if this actor has right on this roll
     * @return {boolean}
     */
    get isOwner() {
        return this._message?.isAuthor || this.messageRoll?.gfl5r.actor?.isOwner || this._message?.isOwner || false;
    }

    /**
     * Create the Roll n Keep dialog
     * @param {number} messageId
     * @param {FormApplicationOptions} options
     */
    constructor(messageId, options = {}) {
        super({}, options);
        this.message = game.messages.get(messageId);
        this.options.editable = this.isOwner;

        this._initializeDiceFaces();
        this._initializeHistory();
    }

    /**
     * Refresh data (used from socket)
     */
    async refresh() {
        if (!this._message) {
            return;
        }
        this._initializeHistory();
        this.render(false);
    }

    /**
     * Render
     * @param {boolean} force
     * @param  {{left?: number, top?: number, width?: number, height?: number, scale?: number, focus?: boolean, renderContext?: string, renderData?: Object}} options
     * @returns {Application}
     * @override
     */
    render(force = false, options = {}) {
        if (!this._message) {
            return;
        }
        this.position.width = "auto";
        this.position.height = "auto";
        return super.render(force, options);
    }

    /**
     * Initialize the dice history list
     * @private
     */
    _initializeHistory() {
        if (!this._message) {
            return;
        }

        // Get the roll
        this.roll = this.messageRoll;

        // Already history
        if (Array.isArray(this.roll.gfl5r.history)) {
            this.object.dicesList = this.roll.gfl5r.history;

            let currentStep = this.roll.gfl5r.history.length - 1;
            if (!this._haveChoice(currentStep, RollnKeepDialog.CHOICES.nothing)) {
                currentStep += 1;
            }
            this.object.currentStep = currentStep;
            return;
        }

        // New
        this.object.dicesList = [[]];
        this.roll.terms.forEach((term) => {
            if (!(term instanceof game.gfl5r.Gfl5rBaseDie)) {
                return;
            }
            term.results.forEach((res) => {
                this.object.dicesList[0].push({
                    type: term.constructor.name,
                    face: res.result,
                    choice: RollnKeepDialog.CHOICES.nothing,
                });
            });
        });
    }

    /**
     * Fill the dices faces
     * @private
     */
    _initializeDiceFaces() {
        // All faces are unique for rings
        this.object.swapDiceFaces.rings = Object.keys(game.gfl5r.ApproachDie.FACES);

        // Only unique for Skills
        this.object.swapDiceFaces.skills = [1, 3, 6, 8, 10, 11, 12];
    }

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @return An array of DragDrop handlers
     */
    _createDragDropHandlers() {
        return [
            new foundry.applications.ux.DragDrop.implementation({
                dragSelector: ".dice.draggable",
                dropSelector: ".dropbox",
                permissions: { dragstart: this.isEditable, drop: this.isEditable },
                callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDropItem.bind(this) },
            }),
        ];
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event	The originating DragEvent
     */
    _onDragStart(event) {
        const target = $(event.currentTarget);
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                step: target.data("step"),
                die: target.data("die"),
            })
        );
    }

    /**
     * Construct and return the data object used to render the HTML template for this form application.
     * @param options
     * @return {Object}
     */
    async getData(options = null) {
        const rollData = this.roll.gfl5r;

        // Disable submit / edition
        this.options.classes = this.options.classes.filter((e) => e !== "finalized");
        this.object.submitDisabled = false;

        if (this._checkKeepCount(this.object.currentStep)) {
            const kept = this._getKeepCount(this.object.currentStep);
            this.object.submitDisabled = kept < 1 || kept > rollData.keepLimit;
        } else if (!this.object.dicesList[this.object.currentStep]) {
            this.options.editable = this.isOwner && rollData.summary.strife > 0;
            this.options.classes.push("finalized");
        }

        return {
            ...(await super.getData(options)),
            isGM: game.user.isGM,
            showChoices: options.editable && !rollData.rnkEnded,
            showStrifeBt: options.editable && rollData.summary.strife > 0 && rollData.actor?.isCharacterType,
            cssClass: this.options.classes.join(" "),
            data: this.object,
            gfl5r: rollData,
        };
    }

    /**
     * Listen to html elements
     * @param {jQuery} html HTML content of the sheet.
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);

        // GM Only, need to be before the editable check
        if (game.user.isGM && this.object.currentStep > 0) {
            // Add Context menu to rollback choices
            new foundry.applications.ux.ContextMenu.implementation(html[0], ".gfl5r.profil", [
                {
                    name: game.i18n.localize("gfl5r.dice.roll_n_keep.undo"),
                    icon: '<i class="fas fa-undo"></i>',
                    callback: () => this._undoLastStepChoices(),
                },
            ], { jQuery: false });
        }

        // Open journal on effect name
        html.find(".effect-name").on("click", this._openEffectJournal.bind(this));

        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        // Finalize Button
        html.find("#finalize").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.object.submitDisabled) {
                this.submit();
            }
        });
    }

    /**
     * Handle dropped items
     */
    async _onDropItem(event) {
        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        const type = $(event.currentTarget).data("type");
        const json = event.dataTransfer.getData("text/plain");
        if (!json || !Object.values(RollnKeepDialog.CHOICES).some((e) => !!e && e === type)) {
            return;
        }

        const data = JSON.parse(json);
        if (!data) {
            return;
        }

        const current = this.object.dicesList[data.step][data.die];
        delete current.newFace;

        switch (type) {
            case RollnKeepDialog.CHOICES.swap: {
                // Dice Type Ring/Skill
                const diceType = $(event.currentTarget).data("die");
                const diceNewFace = $(event.currentTarget).data("face");

                if (current.type !== diceType || current.face === diceNewFace) {
                    current.choice = RollnKeepDialog.CHOICES.nothing;
                    this.render(false);
                    return false;
                }

                current.newFace = diceNewFace;
                this._forceChoiceForDiceWithoutOne(RollnKeepDialog.CHOICES.keep);
                break;
            }

            case RollnKeepDialog.CHOICES.reroll:
                // If reroll, we need to keep all the line by default
                this._forceChoiceForDiceWithoutOne(RollnKeepDialog.CHOICES.keep);
                break;
        }

        current.choice = type;

        // Little time saving : if we reach the max kept dices, discard all dices without a choice
        if (
            this._checkKeepCount(this.object.currentStep) &&
            this._getKeepCount(this.object.currentStep) === this.roll.gfl5r.keepLimit
        ) {
            this._forceChoiceForDiceWithoutOne(RollnKeepDialog.CHOICES.discard);
        }

        this.render(false);
        return false;
    }

    /**
     * Return the current number of dices kept
     * @private
     */
    _getKeepCount(step) {
        return this.object.dicesList[step].reduce((acc, die) => {
            if (
                !!die &&
                [RollnKeepDialog.CHOICES.keep, RollnKeepDialog.CHOICES.reroll, RollnKeepDialog.CHOICES.swap].includes(
                    die.choice
                )
            ) {
                acc = acc + 1;
            }
            return acc;
        }, 0);
    }

    /**
     * Return true if a "_getKeepCount" is needed
     * @param {number} step
     * @returns {boolean}
     * @private
     */
    _checkKeepCount(step) {
        return (
            !this._haveChoice(step, [RollnKeepDialog.CHOICES.reroll, RollnKeepDialog.CHOICES.swap]) &&
            (step === 0 || this._haveChoice(step - 1, [RollnKeepDialog.CHOICES.reroll, RollnKeepDialog.CHOICES.swap]))
        );
    }

    /**
     * Return true if this choice exist in the current step
     * @param {number}          currentStep
     * @param {string|string[]} choices
     * @return {boolean}
     * @private
     */
    _haveChoice(currentStep, choices) {
        if (!Array.isArray(choices)) {
            choices = [choices];
        }
        return (
            this.object.dicesList[currentStep] &&
            this.object.dicesList[currentStep].some((e) => !!e && choices.includes(e.choice))
        );
    }

    /**
     * Discard all dices without a choice for the current step
     * @param {string} newChoice
     * @private
     */
    _forceChoiceForDiceWithoutOne(newChoice) {
        this.object.dicesList[this.object.currentStep]
            .filter((e) => !!e)
            .map((e) => {
                if (e.choice === RollnKeepDialog.CHOICES.nothing) {
                    e.choice = newChoice;
                }
                return e;
            });
    }

    /**
     * Initialize dice array for "step" if needed
     * @param {number} step
     * @private
     */
    _initializeDicesListStep(step) {
        if (!this.object.dicesList[step]) {
            this.object.dicesList[step] = Array(this.object.dicesList[0].length).fill(null);
        }
    }

    /**
     * Apply all choices to build the next step
     * @returns {Promise<void>}
     * @private
     */
    async _applyChoices() {
        let nextStep = this.object.currentStep + 1;
        const haveReroll = this._haveChoice(this.object.currentStep, [
            RollnKeepDialog.CHOICES.reroll,
            RollnKeepDialog.CHOICES.swap,
        ]);

        // Foreach kept dices, apply choices
        const newRolls = {};
        this.object.dicesList[this.object.currentStep].forEach((die, idx) => {
            if (!die) {
                return;
            }

            const currentRow = this.object.dicesList[this.object.currentStep][idx];

            switch (die.choice) {
                case RollnKeepDialog.CHOICES.keep:
                    if (haveReroll) {
                        // Reroll line add all kept into a new line
                        this._initializeDicesListStep(nextStep);
                        this.object.dicesList[nextStep][idx] = foundry.utils.duplicate(currentRow);
                        this.object.dicesList[nextStep][idx].choice = RollnKeepDialog.CHOICES.nothing;
                        currentRow.choice = RollnKeepDialog.CHOICES.discard;
                    } else if (game.gfl5r[die.type].FACES[die.face].explosive) {
                        // Exploding dice : add a new dice in the next step
                        if (!newRolls[die.type]) {
                            newRolls[die.type] = 0;
                        }
                        newRolls[die.type] += 1;
                    }
                    break;

                case RollnKeepDialog.CHOICES.reroll:
                    // Reroll : add a new dice in the next step
                    if (!newRolls[die.type]) {
                        newRolls[die.type] = 0;
                    }
                    newRolls[die.type] += 1;
                    break;

                case RollnKeepDialog.CHOICES.swap:
                    // FaceSwap : add a new dice with selected face in next step
                    this._initializeDicesListStep(nextStep);
                    this.object.dicesList[nextStep][idx] = {
                        type: currentRow.type,
                        face: currentRow.newFace,
                        choice: RollnKeepDialog.CHOICES.nothing,
                    };
                    delete currentRow.newFace;
                    break;
            }
        });

        // If new rolls, roll and add them
        if (Object.keys(newRolls).length > 0) {
            const newRollsResults = await this._newRoll(newRolls);
            this._initializeDicesListStep(nextStep);

            this.object.dicesList[this.object.currentStep].forEach((die, idx) => {
                if (!die) {
                    return;
                }
                if (
                    die.choice === RollnKeepDialog.CHOICES.reroll ||
                    (!haveReroll &&
                        die.choice === RollnKeepDialog.CHOICES.keep &&
                        game.gfl5r[die.type].FACES[die.face].explosive)
                ) {
                    this.object.dicesList[nextStep][idx] = newRollsResults[die.type].shift();
                }
            });
        }
    }

    /**
     * Transform a array (of int or object) into a formula ring/skill
     * @param rolls
     * @returns {string}
     * @private
     */
    _arrayToFormula(rolls) {
        const formula = [];
        if (rolls["ApproachDie"]) {
            const rings = Array.isArray(rolls["ApproachDie"]) ? rolls["ApproachDie"].length : rolls["ApproachDie"];
            formula.push(rings + "da");
        }
        if (rolls["SkillDie"]) {
            const skills = Array.isArray(rolls["SkillDie"]) ? rolls["SkillDie"].length : rolls["SkillDie"];
            formula.push(skills + "ds");
        }
        if (formula.length < 1) {
            return "";
        }
        return formula.join("+");
    }

    /**
     * Roll all new dice at once (better performance) and return the result
     * @private
     */
    async _newRoll(newRolls) {
        const out = {
            ApproachDie: [],
            SkillDie: [],
        };

        const roll = await new game.gfl5r.RollGfl5r(this._arrayToFormula(newRolls));
        await roll.roll();

        // Show DsN dice for the new roll
        if (game.dice3d !== undefined) {
            await game.dice3d.showForRoll(
                roll,
                game.user,
                true,
                this._message.whisper.length === 0 ? null : this._message.whisper,
                this._message.blind
            );
        }

        roll.terms.forEach((term) => {
            if (!(term instanceof game.gfl5r.Gfl5rBaseDie)) {
                return;
            }
            term.results.forEach((res) => {
                out[term.constructor.name].push({
                    type: term.constructor.name,
                    face: res.result,
                    choice: RollnKeepDialog.CHOICES.nothing,
                });
            });
        });

        return out;
    }

    /**
     * Rebuild the message roll
     * @param {boolean} forceKeep If true keep all dice regardless their choice
     * @returns {Promise<void>}
     * @private
     */
    async _rebuildRoll(forceKeep = false) {
        // Get all kept dices + new (choice null)
        const diceList = this.object.dicesList.reduce((acc, step, stepIdx) => {
            const haveReroll =
                stepIdx > 0 &&
                this._haveChoice(stepIdx - 1, [RollnKeepDialog.CHOICES.reroll, RollnKeepDialog.CHOICES.swap]);
            step.forEach((die, idx) => {
                if (
                    !!die &&
                    (forceKeep ||
                        die.choice === RollnKeepDialog.CHOICES.keep ||
                        (haveReroll && die.choice === RollnKeepDialog.CHOICES.nothing))
                ) {
                    if (!acc[die.type]) {
                        acc[die.type] = [];
                    }
                    // Check previous dice, to add html classes in chat
                    if (stepIdx > 0 && this.object.dicesList[stepIdx - 1][idx]) {
                        switch (this.object.dicesList[stepIdx - 1][idx].choice) {
                            case RollnKeepDialog.CHOICES.reroll:
                                die.class = "rerolled";
                                break;
                            case RollnKeepDialog.CHOICES.swap:
                                die.class = "swapped";
                                break;
                        }
                    }
                    acc[die.type].push(die);
                }
            });
            return acc;
        }, {});

        // Re create a new roll
        const roll = await new game.gfl5r.RollGfl5r(this._arrayToFormula(diceList));
        roll.gfl5r = {
            ...this.roll.gfl5r,
            summary: roll.gfl5r.summary,
            history: this.object.dicesList,
        };

        // Fill the data
        await roll.evaluate();

        // Modify results
        roll.terms.map((term) => {
            if (term instanceof game.gfl5r.Gfl5rBaseDie) {
                term.results.map((res) => {
                    const die = diceList[term.constructor.name].shift();
                    res.result = die.face;

                    // add class to term result
                    if (die.class) {
                        res[die.class] = true;
                    }
                    return res;
                });
                term.l5rSummary();
            }
            return term;
        });

        // Recompute summary
        roll.l5rSummary();

        // Add roll & history to message
        this.roll = roll;
    }

    /**
     * Send the new roll in chat and delete the old message
     * @returns {Promise<void>}
     * @private
     */
    async _toChatMessage() {
        // Keep old Ids
        const appOldId = this.id;
        const msgOldId = this._message.id;

        if (this.roll.gfl5r.isInitiativeRoll) {
            let msgOptions = {
                rnkRoll: this.roll,
                rollMode: game.gfl5r.HelpersGfl5r.getRollMode(this._message),
            };

            await this.roll.gfl5r.actor.rollInitiative({
                rerollInitiative: true,
                initiativeOptions: {
                    messageOptions: msgOptions,
                },
            });
            // Adhesive tape to get the message :/
            this.message = msgOptions.rnkMessage;
            delete msgOptions.rnkMessage;
        } else {
            // Send it to chat, switch to new message
            this.message = await this.roll.toMessage(
                {},
                { rollMode: game.gfl5r.HelpersGfl5r.getRollMode(this._message) }
            );
        }

        // Refresh viewers
        if (this._message) {
            game.gfl5r.sockets.updateMessageIdAndRefresh(appOldId, this._message.id);
        }

        // Delete old chat message related to this series
        if (game.settings.get(CONFIG.gfl5r.namespace, "rnk-deleteOldMessage")) {
            if (game.user.isFirstGM) {
                const message = game.messages.get(msgOldId);
                if (message) {
                    message.delete();
                }
            } else {
                game.gfl5r.sockets.deleteChatMessage(msgOldId);
            }
        }
    }

    /**
     * This method is called upon form submission after form data is validated
     * @param event    The initial triggering submission event
     * @param formData The object of validated form data with which to update the object
     * @returns        A Promise which resolves once the update operation has completed
     * @override
     */
    async _updateObject(event, formData) {
        // *** Everything below here is only needed if the sheet is editable ***
        if (!this.isEditable) {
            return;
        }

        // Last step strife choice
        if (this.roll?.gfl5r?.rnkEnded && formData.strifeApplied !== undefined) {
            // Apply strife to actor
            const strifeApplied = Math.min(this.roll.gfl5r.summary.strife, Math.max(0, formData.strifeApplied));
            const actorMod = strifeApplied - this.roll.gfl5r.strifeApplied;
            if (actorMod !== 0 && this.roll.gfl5r.actor?.isCharacterType) {
                await this.roll.gfl5r.actor.update({
                    system: {
                        strife: {
                            value: Math.max(0, this.roll.gfl5r.actor.system.strife.value + actorMod),
                        },
                    },
                });
                // Update the roll & send to chat
                this.roll.gfl5r.strifeApplied = strifeApplied;
                await this._toChatMessage();
            }
            return this.close();
        }

        // Discard all dices without a choice for the current step
        this._forceChoiceForDiceWithoutOne(RollnKeepDialog.CHOICES.discard);

        // Apply all choices to build the next step
        await this._applyChoices();

        // *** Below this the current step become the next step ***
        this.object.currentStep++;

        // Rebuild the roll
        await this._rebuildRoll(false);

        // Send the new roll in chat and delete the old message
        await this._toChatMessage();

        // If a next step exist or strife, rerender, else close
        if (this.object.dicesList[this.object.currentStep] || this.roll.gfl5r.summary.strife > 0) {
            return this.render(false);
        }
        return this.close();
    }

    /**
     * Undo the last step choice
     * @returns {Promise<Application|any>}
     * @private
     */
    async _undoLastStepChoices() {
        // Find the step to work to
        this.object.currentStep = this.object.dicesList[this.object.currentStep]
            ? this.object.currentStep
            : Math.max(0, this.object.currentStep - 1);

        // If all clear, delete this step
        if (this._haveChoice(this.object.currentStep, RollnKeepDialog.CHOICES.nothing)) {
            if (this.object.currentStep === 0) {
                return;
            }
            this.object.dicesList.pop();
            this.object.dicesList = this.object.dicesList.filter((e) => !!e);
            this.object.currentStep--;
        }

        // Clear choices
        this.object.dicesList[this.object.currentStep]
            .filter((e) => !!e)
            .map((e) => {
                e.choice = RollnKeepDialog.CHOICES.nothing;
                return e;
            });

        this.options.editable = this.isOwner;
        await this._rebuildRoll(true);
        await this._toChatMessage();
        return this.render(false);
    }

    /**
     * Handle execution of a chat card action via a click event on the RnK button
     * @param {Event} event The originating click event
     * @returns {Promise}   A promise which resolves once the handler workflow is complete
     */
    static async onChatAction(event) {
        event.preventDefault();
        event.stopPropagation();

        // Extract card data
        const button = $(event.currentTarget);
        button.attr("disabled", true);
        const card = button.parents(".gfl5r.item-display.dices-gfl5r");
        const messageId = card.parents(".chat-message").data("message-id");

        // Already open ? close it
        const app = game.gfl5r.HelpersGfl5r.getApplication(`gfl5r-roll-n-keep-dialog-${messageId}`);
        if (app) {
            app.close();
        } else {
            new RollnKeepDialog(messageId).render(true);
        }

        // Re-enable the button
        button.attr("disabled", false);
    }

    /**
     * Open the core linked journal effect if exist
     * @param {Event} event
     * @private
     */
    async _openEffectJournal(event) {
        event.preventDefault();
        event.stopPropagation();

        const effectId = $(event.currentTarget).data("effect-id");
        if (!effectId) {
            return;
        }

        const effect = this.roll.gfl5r?.actor?.effects?.get(effectId);
        if (!effect?.system?.id && !effect?.system?.uuid) {
            return;
        }

        const journal = await game.gfl5r.HelpersGfl5r.getObjectGameOrPack({
            id: effect.system.id,
            uuid: effect.system.uuid,
            type: "JournalEntry",
        });
        if (journal) {
            // Open on the "rules" section. If non exists then it will open the first page
            journal.sheet.render(true, {pageIndex: 2});
        }
    }
}
