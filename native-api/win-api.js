"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinApi = void 0;
// eslint-disable-next-line @typescript-eslint/no-var-requires
var fbitNative = require('./fbitnative/build/Release/FbitWin');
var WinApi = /** @class */ (function () {
    function WinApi() {
    }
    WinApi.prototype.pressPhraseKey = function (char) {
        fbitNative.pressPhraseKey(char.charCodeAt(0));
    };
    WinApi.prototype.pressKey = function (key) {
        fbitNative.pressKey(key);
    };
    WinApi.prototype.getActiveWindowTitle = function () {
        return fbitNative.getActiveWindowTitle();
    };
    return WinApi;
}());
exports.WinApi = WinApi;
//# sourceMappingURL=win-api.js.map