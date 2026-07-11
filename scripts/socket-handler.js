/**
 * GFL5R Socket Handler
 */
export class SocketHandlerGfl5r {
    /**
     * Namespace in FVTT
     */
    static SOCKET_NAME = "system.gfl5r";

    constructor() {
        this.registerSocketListeners();
    }

    /**
     * registers all the socket listeners
     */
    registerSocketListeners() {
        game.socket.on(SocketHandlerGfl5r.SOCKET_NAME, (payload) => {
            switch (payload.type) {
                case "deleteChatMessage":
                    this._onDeleteChatMessage(payload);
                    break;

                case "refreshAppId":
                    this._onRefreshAppId(payload);
                    break;

                case "updateMessageIdAndRefresh":
                    this._onUpdateMessageIdAndRefresh(payload);
                    break;

                case "openDicePicker":
                    this._onOpenDicePicker(payload);
                    break;

                default:
                    console.warn(new Error("GFL5R | SH | This socket event is not supported"), payload);
                    break;
            }
        });
    }

    /**
     * Delete ChatMessage by ID, the GM permission is required (used in RnK).
     * @param {String} messageId
     */
    deleteChatMessage(messageId) {
        game.socket.emit(SocketHandlerGfl5r.SOCKET_NAME, {
            type: "deleteChatMessage",
            messageId,
            userId: game.userId,
        });
    }
    _onDeleteChatMessage(payload) {
        // Only delete the message if the user is a GM (otherwise it has no real effect)
        // Currently only used in RnK
        if (!game.user.isFirstGM || !game.settings.get(CONFIG.gfl5r.namespace, "rnk-deleteOldMessage")) {
            return;
        }
        game.messages.get(payload.messageId)?.delete();
    }

    /**
     * Refresh an app by his "id", not "appId" (ex "gfl5r-twenty-questions-dialog-kZHczAFghMNYFRWe", not "65")
     *
     * Usage : game.gfl5r.sockets.refreshAppId(appId);
     *
     * @param {String} appId
     */
    refreshAppId(appId) {
        game.gfl5r.HelpersGfl5r.debounce(appId, () => {
            game.socket.emit(SocketHandlerGfl5r.SOCKET_NAME, {
                type: "refreshAppId",
                appId,
            });
        })();
    }
    _onRefreshAppId(payload) {
        const app = game.gfl5r.HelpersGfl5r.getApplication(payload.appId);
        if (!app || typeof app.refresh !== "function") {
            return;
        }
        app.refresh();
    }

    /**
     * Change in app message and refresh (used in RnK)
     * @param {String} appId
     * @param {String} msgId
     */
    updateMessageIdAndRefresh(appId, msgId) {
        game.socket.emit(SocketHandlerGfl5r.SOCKET_NAME, {
            type: "updateMessageIdAndRefresh",
            appId,
            msgId,
        });
    }
    _onUpdateMessageIdAndRefresh(payload) {
        const app = game.gfl5r.HelpersGfl5r.getApplication(payload.appId);
        if (!app || !app.message || typeof app.refresh !== "function") {
            return;
        }
        app.message = game.messages.get(payload.msgId);
        app.refresh();
    }

    /**
     * Remotely open the DicePicker
     *
     * Usage : game.gfl5r.sockets.openDicePicker({
     *   users: game.users.players.filter(u => u.active && u.hasPlayerOwner),
     *   dpOptions: {
     *     ringId: 'water',
     *     skillId: 'unarmed',
     *     skillList: 'melee,range,unarmed',
     *     difficulty: 3,
     *     difficultyHidden: true,
     *   }
     * });
     *
     * @param {User[]}  users     Users list to trigger the DP (will be reduced to id for network perf.)
     * @param {Actor[]} actors    Actors list to trigger the DP (will be reduced to uuid for network perf.)
     * @param {Object}  dpOptions Any DicePickerDialog.options
     */
    openDicePicker({ users = [], actors = [], dpOptions = {} }) {
        // At least one user or one actor
        if (foundry.utils.isEmpty(users) && foundry.utils.isEmpty(actors)) {
            console.error("GFL5R | SH | openDicePicker - 'users' and 'actors' are both empty, use at least one.");
            return;
        }
        // Fail if dpOptions.actor* provided
        if (!foundry.utils.isEmpty(dpOptions?.actorName)) {
            console.error("GFL5R | SH | openDicePicker - Do not use 'dpOptions.actorName', use 'actors' list instead.");
            return;
        }
        if (!foundry.utils.isEmpty(dpOptions?.actorId)) {
            console.error("GFL5R | SH | openDicePicker - Do not use 'dpOptions.actorId', use 'actors' list instead.");
            return;
        }
        if (!foundry.utils.isEmpty(dpOptions?.actor)) {
            console.error("GFL5R | SH | openDicePicker - Do not use 'dpOptions.actor', use 'actors' list instead.");
            return;
        }

        game.socket.emit(SocketHandlerGfl5r.SOCKET_NAME, {
            type: "openDicePicker",
            users: users?.map((u) => u.id),
            actors: actors?.map((a) => a.uuid),
            dpOptions,
        });
    }
    _onOpenDicePicker(payload) {
        if (!foundry.utils.isEmpty(payload.users) && !payload.users.includes(game.user.id)) {
            return;
        }

        // Actors
        if (!foundry.utils.isEmpty(payload.actors)) {
            payload.actors.forEach((uuid) => {
                const actor = fromUuidSync(uuid);
                if (actor && actor.testUserPermission(game.user, "OWNER")) {
                    new game.gfl5r.DicePickerDialog({
                        ...payload.dpOptions,
                        actor: actor,
                    }).render(true);
                }
            });
            return;
        }

        // User Only : Let the DP select the actor
        new game.gfl5r.DicePickerDialog(payload.dpOptions).render(true);
    }
}
