"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinApiService = void 0;
var WinApiService = /** @class */ (function () {
    function WinApiService() {
        this._instance = require('./fbitnative/build/Release/FbitWin');
    }
    WinApiService.prototype.pressPhraseKey = function (char) {
        this._instance.pressPhraseKey(char.charCodeAt(0));
    };
    WinApiService.prototype.pressKey = function (key) {
        this._instance.pressKey(key);
    };
    WinApiService.prototype.getActiveWindowTitle = function () {
        return this._instance.getActiveWindowTitle();
    };
    return WinApiService;
}());
exports.WinApiService = WinApiService;
