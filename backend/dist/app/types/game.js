"use strict";
/**
 * Game-specific type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventType = void 0;
var GameEventType;
(function (GameEventType) {
    // Box Hit events
    GameEventType["BOX_CREATED"] = "box_created";
    GameEventType["BOX_HIT"] = "box_hit";
    GameEventType["BOX_MISS"] = "box_miss";
    GameEventType["BOX_EXPIRED"] = "box_expired";
    // Towers events
    GameEventType["TOWER_CREATED"] = "tower_created";
    GameEventType["TOWER_BUILD"] = "tower_build";
    GameEventType["TOWER_COMPLETE"] = "tower_complete";
    GameEventType["TOWER_COLLAPSE"] = "tower_collapse";
    // Common events
    GameEventType["BET_PLACED"] = "bet_placed";
    GameEventType["CONTRACT_SETTLED"] = "contract_settled";
    GameEventType["GAME_STATE_UPDATE"] = "game_state_update";
})(GameEventType || (exports.GameEventType = GameEventType = {}));
