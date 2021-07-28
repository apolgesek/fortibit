"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowService = void 0;
/* eslint-disable @typescript-eslint/no-var-requires */
var electron_1 = require("electron");
var path_1 = require("path");
var url_1 = require("url");
var WindowService = /** @class */ (function () {
    function WindowService(isDevMode) {
        this._isDevMode = isDevMode;
    }
    WindowService.prototype.createWindow = function () {
        var tstamp = new Date().getTime();
        var window = new electron_1.BrowserWindow({
            width: 960,
            height: 600,
            resizable: true,
            minHeight: 520,
            minWidth: 840,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                allowRunningInsecureContent: this._isDevMode,
                devTools: this._isDevMode,
                backgroundThrottling: false,
                contextIsolation: false,
                partition: "persist:" + tstamp
            },
        });
        if (this._isDevMode) {
            window.webContents.openDevTools();
        }
        return window;
    };
    WindowService.prototype.loadWindow = function (windowRef) {
        if (this._isDevMode) {
            require('electron-reload')(global['__basedir'], {
                electron: require(global['__basedir'] + "/node_modules/electron")
            });
            windowRef.loadURL('http://localhost:4200');
        }
        else {
            windowRef.loadURL(url_1.format({
                pathname: path_1.join(global['__basedir'] + "/dist/index.html"),
                protocol: 'file:',
                slashes: true
            }));
        }
    };
    return WindowService;
}());
exports.WindowService = WindowService;
