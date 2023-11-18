"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateState = void 0;
var UpdateState;
(function (UpdateState) {
    UpdateState[UpdateState["Unknown"] = 0] = "Unknown";
    UpdateState[UpdateState["ConnectionFailed"] = 1] = "ConnectionFailed";
    UpdateState[UpdateState["NotAvailable"] = 2] = "NotAvailable";
    UpdateState[UpdateState["Available"] = 3] = "Available";
    UpdateState[UpdateState["Downloaded"] = 4] = "Downloaded";
})(UpdateState || (exports.UpdateState = UpdateState = {}));
//# sourceMappingURL=update-state.model.js.map