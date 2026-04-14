/**
 * Roll for GFL5R
 */
export class RollGfl5r extends Roll {
    static CHAT_TEMPLATE = "dice/chat-roll.html";
    static TOOLTIP_TEMPLATE = "dice/tooltip.html";

    /**
     * Specific data for L5R
     */
    gfl5r = {
        actor: null,
        dicesTypes: {
            std: false,
            gfl5r: false,
        },
        difficulty: 2,
        difficultyHidden: false,
        history: null,
        initialFormula: null,
        isInitiativeRoll: false,
        item: null,
        keepLimit: null,
        rnkEnded: false,
        skillAssistance: 0,
        skillCatId: "",
        skillId: "",
        stance: "",
        strifeApplied: 0,
        summary: {
            totalSuccess: 0,
            totalBonus: 0,
            success: 0,
            explosive: 0,
            opportunity: 0,
            strife: 0,
        },
        target: null,
        fortunePointUsed: false,
    };

    constructor(formula, data = {}, options = {}) {
        super(formula, data, options);

        // Parse flavor for stance and skillId
        const flavors = Array.from(formula.matchAll(/\d+d([as])\[([^\]]+)\]/gmu));
        flavors.forEach((res) => {
            if (res[1] === "a" && !!res[2] && this.gfl5r.stance === "") {
                this.gfl5r.stance = res[2];
            }
            if (res[1] === "s" && !!res[2] && this.gfl5r.skillId === "") {
                this.gfl5r.skillId = res[2];
            }
        });

        // Target Infos : get the 1st selected target
        const targetToken = Array.from(game.user.targets).values().next()?.value?.document;
        if (targetToken) {
            this.target = targetToken;
        }
    }

    /**
     * Set actor
     * @param {ActorGfl5r} actor
     */
    set actor(actor) {
        this.gfl5r.actor = actor instanceof Actor && actor.isOwner ? actor : null;
    }

    /**
     * Set Target Infos (Name, Img)
     * @param {TokenDocument} targetToken
     */
    set target(targetToken) {
        this.gfl5r.target = targetToken || null;
    }

    /**
     * Execute the Roll, replacing dice and evaluating the total result
     * @override
     **/
    async evaluate({ minimize = false, maximize = false } = {}) {
        if (this._evaluated) {
            throw new Error("This Roll object has already been rolled.");
        }
        if (this.terms.length < 1) {
            throw new Error("This Roll object need dice to be rolled.");
        }

        // Clean terms (trim symbols)
        this.terms = this.constructor.simplifyTerms(this.terms);

        // Roll dices and inner dices
        this._total = 0;

        // Roll
        await super.evaluate({ minimize, maximize });
        this._evaluated = true;

        // Save initial formula
        if (!this.gfl5r.initialFormula) {
            this.gfl5r.initialFormula = this.formula;
        }

        // Compute summary
        this.l5rSummary();

        return this;
    }

    /**
     * Summarise the total of success, strife... for L5R dices for the current roll
     *
     * @private
     */
    l5rSummary() {
        const summary = this.gfl5r.summary;

        // Reset totals
        summary.success = 0;
        summary.explosive = 0;
        summary.opportunity = 0;
        summary.strife = 0;
        summary.totalSuccess = 0;

        // Current terms - L5R Summary
        this.terms.forEach((term) => this._l5rTermSummary(term));

        // Check inner L5R rolls - L5R Summary
        this._dice.forEach((term) => this._l5rTermSummary(term));

        // Store final outputs
        this.gfl5r.dicesTypes.std = this.dice.some(
            (term) => term instanceof foundry.dice.terms.DiceTerm && !(term instanceof game.gfl5r.Gfl5rBaseDie)
        ); // ignore math symbols
        this.gfl5r.dicesTypes.gfl5r = this.dice.some((term) => term instanceof game.gfl5r.Gfl5rBaseDie);
        summary.totalBonus = Math.max(0, summary.totalSuccess - this.gfl5r.difficulty);

        if (!this.gfl5r.keepLimit) {
            // count approach die + skill assistance
            this.gfl5r.keepLimit =
                this.dice.reduce((acc, term) => (term instanceof game.gfl5r.ApproachDie ? acc + term.number : acc), 0) +
                Math.max(0, this.gfl5r.skillAssistance || 0);

            // if only bulk skill dice, count the skill dice
            if (!this.gfl5r.keepLimit) {
                this.gfl5r.keepLimit = this.dice.reduce(
                    (acc, term) => (term instanceof game.gfl5r.SkillDie ? acc + term.number : acc),
                    0
                );
            }
        }

        // RnK Can do some action ?
        if (this.gfl5r.history) {
            this.gfl5r.rnkEnded = !this.gfl5r.history[this.gfl5r.history.length - 1].some(
                (e) => !!e && e.choice === null
            );
        }
    }

    /**
     * Summarise the total of success, strife... for L5R dices for the current term
     *
     * @param term
     * @private
     */
    _l5rTermSummary(term) {
        if (!(term instanceof game.gfl5r.Gfl5rBaseDie)) {
            return;
        }

        ["success", "explosive", "opportunity", "strife"].forEach((props) => {
            this.gfl5r.summary[props] += parseInt(term.gfl5r[props]);
        });
        this.gfl5r.summary.totalSuccess += term.totalSuccess;
    }

    /**
     * Return the total result of the Roll expression if it has been evaluated, otherwise null
     * @override
     */
    get total() {
        // Return null to trigger the L5R template.
        // This beak inline roll, but as we need RnK to really resolve the roll, this is acceptable...
        if (this.gfl5r.dicesTypes.gfl5r) {
            return null;
        }

        if (!this._evaluated) {
            return null;
        }

        let total = "";

        // Regular dices total (eg 6)
        if (this.gfl5r.dicesTypes.std) {
            total = this._total;
        }

        // Add L5R summary
        // if (this.gfl5r.dicesTypes.gfl5r) {
        //     const summary = this.gfl5r.summary;
        //     total +=
        //         (this.gfl5r.dicesTypes.std ? " | " : "") +
        //         ["success", "explosive", "opportunity", "strife"]
        //             .map((props) => (summary[props] > 0 ? `<i class="i_${props}"></i> ${summary[props]}` : null))
        //             .filter((c) => !!c)
        //             .join(" | ");
        // }
        return total;
    }

    /**
     * Render the tooltip HTML for a Roll instance and inner rolls (eg [[2ds]])
     * @param contexte Used to differentiate render (no gfl5r dices) or inline tooltip (with gfl5r dices)
     * @override
     */
    getTooltip(contexte = null) {
        const parts = this.dice.map((term) => {
            const cls = term.constructor;
            const isL5rDie = term instanceof game.gfl5r.Gfl5rBaseDie;

            return {
                formula: term.formula,
                total: term.total,
                faces: term.faces,
                flavor: term.options.flavor,
                isDieL5r: isL5rDie,
                isDieStd: !isL5rDie,
                display: !isL5rDie || contexte?.from !== "render",
                rolls: term.results.map((r) => {
                    return {
                        result: term.getResultLabel(r),
                        classes: [
                            cls.name.toLowerCase(),
                            "d" + term.faces,
                            isL5rDie && r.swapped ? "swapped" : null,
                            r.rerolled ? "rerolled" : null,
                            r.exploded ? "exploded" : null,
                            !isL5rDie && r.discarded ? "discarded" : null,
                            !isL5rDie && r.result === 1 ? "min" : null,
                            !isL5rDie && r.result === term.faces ? "max" : null,
                        ]
                            .filter((c) => !!c)
                            .join(" "),
                    };
                }),
            };
        });
        parts.addedResults = this.addedResults;

        const chatData = {
            parts: parts,
            gfl5r: this.gfl5r,
            displaySummary: contexte?.from !== "render",
        };

        return foundry.applications.handlebars.renderTemplate(CONFIG.gfl5r.paths.templates + this.constructor.TOOLTIP_TEMPLATE, { chatData });
    }

    /**
     * Render a Roll instance to HTML
     * @override
     */
    async render(chatOptions = {}) {
        chatOptions = foundry.utils.mergeObject(
            {
                user: game.user.id,
                flavor: null,
                template: CONFIG.gfl5r.paths.templates + this.constructor.CHAT_TEMPLATE,
                blind: false,
            },
            chatOptions
        );
        const isPrivate = chatOptions.isPrivate;

        // Execute the roll, if needed
        if (!this._evaluated) {
            await this.roll();
        }

        // Define chat data
        const chatData = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : chatOptions.flavor || this.options.flavor,
            user: chatOptions.user,
            isPublicRoll: !isPrivate,
            tooltip: isPrivate ? "" : await this.getTooltip({ from: "render" }),
            total: isPrivate ? "?" : this.total,
            profileImg: this.gfl5r.actor?.img || "icons/svg/mystery-man.svg",
            noTargetDisclosure:
                typeof this.gfl5r.item?.system?.difficulty === "string" &&
                this.gfl5r.item.system.difficulty.startsWith("@T:") &&
                /\|m(in|ax)/.test(this.gfl5r.item.system.difficulty),
            gfl5r: isPrivate
                ? {}
                : {
                      ...this.gfl5r,
                      dices: this.dice.map((term) => {
                          const isL5rDie = term instanceof game.gfl5r.Gfl5rBaseDie;
                          return {
                              diceTypeL5r: isL5rDie,
                              rolls: term.results.map((r) => {
                                  return {
                                      result: term.getResultLabel(r),
                                      classes: [
                                          isL5rDie && r.swapped ? "swapped" : null,
                                          r.rerolled ? "rerolled" : null,
                                          r.exploded ? "exploded" : null,
                                      ]
                                          .filter((c) => !!c)
                                          .join(" "),
                                  };
                              }),
                          };
                      }),
                  },
        };

        // Render the roll display template
        return foundry.applications.handlebars.renderTemplate(chatOptions.template, chatData);
    }

    /**
     * Transform a Roll instance into a ChatMessage, displaying the roll result.
     * This function can either create the ChatMessage directly, or return the data object that will be used to create.
     * @override
     */
    async toMessage(messageData = {}, { rollMode = null } = {}) {
        // Perform the roll, if it has not yet been rolled
        if (!this._evaluated) {
            await this.evaluate();
        }

        // RollMode
        const rMode = rollMode || messageData.rollMode || game.settings.get("core", "rollMode");
        if (rMode) {
            messageData = ChatMessage.applyRollMode(messageData, rMode);
        }

        // Force the content to avoid weird foundry behaviour
        const content = this.gfl5r.dicesTypes.gfl5r ? await this.render({}) : this.total;

        // Prepare chat data
        messageData = foundry.utils.mergeObject(
            {
                user: game.user.id,
                content,
                sound: CONFIG.sounds.dice,
                speaker: {
                    actor: this.gfl5r.actor?.id || null,
                    token: this.gfl5r.actor?.token || null,
                    alias: this.gfl5r.actor?.name || null,
                },
            },
            messageData
        );
        messageData.rolls = [this];

        // Either create the message or just return the chat data
        return ChatMessage.implementation.create(messageData, {
            rollMode: rMode,
        });
    }

    /** @override */
    static fromData(data) {
        const roll = super.fromData(data);

        roll.data = foundry.utils.duplicate(data.data);
        roll.gfl5r = foundry.utils.duplicate(data.gfl5r);

        // Get real Actor object
        if (data.gfl5r.actor) {
            if (data.gfl5r.actor instanceof game.gfl5r.ActorGfl5r) {
                // Duplicate break the object, relink it
                roll.gfl5r.actor = data.gfl5r.actor;
            } else if (data.gfl5r.actor.uuid) {
                // Only uuid, get the object
                let actor;
                const tmpItem = fromUuidSync(data.gfl5r.actor.uuid);
                if (tmpItem instanceof Actor) {
                    actor = tmpItem;
                } else if (tmpItem instanceof TokenDocument) {
                    actor = tmpItem.actor;
                }
                if (actor) {
                    roll.gfl5r.actor = actor;
                }
            } else if (data.gfl5r.actor.id) {
                // Compat old chat message : only id
                const actor = game.actors.get(data.gfl5r.actor.id);
                if (actor) {
                    roll.gfl5r.actor = actor;
                }
            }
        }

        // Get real Item object
        if (data.gfl5r.item) {
            if (data.gfl5r.item instanceof game.gfl5r.ItemGfl5r) {
                // Duplicate break the object, relink it
                roll.gfl5r.item = data.gfl5r.item;
            } else if (data.gfl5r.item.uuid) {
                // Only uuid, get the object
                const tmpItem = fromUuidSync(data.gfl5r.item.uuid);
                if (tmpItem) {
                    roll.gfl5r.item = tmpItem;
                }
            }
        }

        // Get real Target object
        if (data.gfl5r.target) {
            if (data.gfl5r.target instanceof TokenDocument) {
                // Duplicate break the object, relink it
                roll.gfl5r.target = data.gfl5r.target;
            } else if (data.gfl5r.target.uuid) {
                // Only uuid, get the object
                const tmpItem = fromUuidSync(data.gfl5r.target.uuid);
                if (tmpItem) {
                    roll.gfl5r.target = tmpItem;
                }
            }
        }

        return roll;
    }

    /**
     * Represent the data of the Roll as an object suitable for JSON serialization
     * @override
     */
    toJSON() {
        const json = super.toJSON();

        json.data = foundry.utils.duplicate(this.data);
        json.gfl5r = foundry.utils.duplicate(this.gfl5r);

        // Lightweight the Actor
        if (json.gfl5r.actor && this.gfl5r.actor?.uuid) {
            json.gfl5r.actor = {
                uuid: this.gfl5r.actor.uuid,
            };
        }

        // Lightweight the Item
        if (json.gfl5r.item && this.gfl5r.item?.uuid) {
            json.gfl5r.item = {
                uuid: this.gfl5r.item.uuid,
            };
        }

        // Lightweight the Target Token
        if (json.gfl5r.target && this.gfl5r.target?.uuid) {
            json.gfl5r.target = {
                uuid: this.gfl5r.target.uuid,
            };
        }

        return json;
    }
}
