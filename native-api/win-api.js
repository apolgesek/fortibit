"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinApi = void 0;
var FFI = require('ffi-napi');
var StructType = require('ref-struct-napi');
var UnionType = require('ref-union-napi');
var ref = require('ref-napi');
var wchar = require('ref-wchar-napi');
var WinApi = /** @class */ (function () {
    function WinApi() {
        this.user32 = new FFI.Library('user32.dll', {
            'SendInput': ['uint32', ['int32', 'pointer', 'int32']],
            'GetWindowTextW': ['int', ['pointer', 'pointer', 'int']],
            'GetWindowTextLengthW': ['int', ['pointer']],
            'GetForegroundWindow': ['pointer', []],
        });
        this.MOUSEINPUT = StructType({
            dx: 'int32',
            dy: 'int32',
            mouseData: 'uint32',
            flags: 'uint32',
            time: 'uint32',
            extraInfo: 'pointer',
        });
        this.KEYBDINPUT = StructType({
            vk: 'uint16',
            scan: 'uint16',
            flags: 'uint32',
            time: 'uint32',
            extraInfo: 'pointer',
        });
        this.HARDWAREINPUT = StructType({
            msg: 'uint32',
            paramL: 'uint16',
            paramH: 'uint16',
        });
        this.INPUT_UNION = UnionType({
            mi: this.MOUSEINPUT,
            ki: this.KEYBDINPUT,
            hi: this.HARDWAREINPUT,
        });
        this.INPUT = StructType({
            type: 'uint32',
            union: this.INPUT_UNION,
        });
    }
    WinApi.prototype.pressPhraseKey = function (char) {
        var scanCode = char.charCodeAt(0);
        this.sendInput(0, scanCode);
    };
    WinApi.prototype.pressKey = function (key) {
        this.sendInput(key, 0);
    };
    WinApi.prototype.getActiveWindowTitle = function () {
        var handle = this.user32.GetForegroundWindow();
        var windowTextLength = this.user32.GetWindowTextLengthW(handle);
        var windowTextBuffer = Buffer.alloc((windowTextLength * 2) + 4);
        this.user32.GetWindowTextW(handle, windowTextBuffer, windowTextLength + 2);
        var windowTextBufferClean = ref.reinterpretUntilZeros(windowTextBuffer, wchar.size);
        var windowTitle = wchar.toString(windowTextBufferClean);
        return windowTitle;
    };
    WinApi.prototype.sendInput = function (key, scanCode) {
        var keyDownKeyboardInput = this.KEYBDINPUT({ vk: key, extraInfo: ref.NULL_POINTER, time: 0, scan: scanCode, flags: 0x0004 });
        var keyDownInput = this.INPUT({ type: 1, union: this.INPUT_UNION({ ki: keyDownKeyboardInput }) });
        this.user32.SendInput(1, keyDownInput.ref(), this.INPUT.size);
        var keyUpKeyboardInput = this.KEYBDINPUT({ vk: key, extraInfo: ref.NULL_POINTER, time: 0, scan: scanCode, flags: 0x0002 | 0x0004 });
        var keyUpInput = this.INPUT({ type: 1, union: this.INPUT_UNION({ ki: keyUpKeyboardInput }) });
        this.user32.SendInput(1, keyUpInput.ref(), this.INPUT.size);
    };
    return WinApi;
}());
exports.WinApi = WinApi;
//# sourceMappingURL=win-api.js.map