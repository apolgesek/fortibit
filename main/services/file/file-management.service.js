"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagementService = void 0;
var fs_1 = require("fs");
var __1 = require("..");
var config_1 = require("../../../config");
var shared_models_1 = require("../../../shared-models");
var state_store_1 = require("../../store/state-store");
var FileManagementService = /** @class */ (function () {
    function FileManagementService(encryptionService) {
        this._fileFilters = {
            filters: [{ name: 'Fortibit database file', extensions: [config_1.appConfig.fileExtension] }]
        };
        this._encryptionService = encryptionService;
    }
    FileManagementService.prototype.saveFile = function (event, database, newPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var savePath, dialog, browserWindow, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        savePath = { filePath: state_store_1.StateStore.fileMap.get(event.sender.id), canceled: false };
                        if (!!state_store_1.StateStore.currentPassword) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                    case 1:
                        dialog = (_b.sent()).dialog;
                        browserWindow = state_store_1.StateStore.windows.find(function (x) { return x.webContents.id === event.sender.id; });
                        return [4 /*yield*/, dialog.showSaveDialog(browserWindow, this._fileFilters)];
                    case 2:
                        savePath = _b.sent();
                        if (savePath.canceled) {
                            event.reply(shared_models_1.IpcChannel.GetSaveStatus, { status: false });
                            return [2 /*return*/];
                        }
                        _b.label = 3;
                    case 3:
                        _a = this;
                        return [4 /*yield*/, this._encryptionService.createEncryptionProcess()];
                    case 4:
                        _a._encryptionProcess = _b.sent();
                        this._encryptionProcess.once('message', function (encrypted) { return __awaiter(_this, void 0, void 0, function () {
                            var finalFilePath;
                            return __generator(this, function (_a) {
                                finalFilePath = savePath.filePath.endsWith(config_1.appConfig.fileExtension)
                                    ? savePath.filePath
                                    : savePath.filePath + '.' + config_1.appConfig.fileExtension;
                                try {
                                    fs_1.writeFile(finalFilePath, encrypted, { encoding: 'base64' }, function () {
                                        state_store_1.StateStore.fileMap.set(event.sender.id, finalFilePath);
                                        event.reply(shared_models_1.IpcChannel.GetSaveStatus, { status: true, file: state_store_1.StateStore.fileMap.get(event.sender.id) });
                                    });
                                }
                                catch (err) {
                                    event.reply(shared_models_1.IpcChannel.GetSaveStatus, { status: false, message: err });
                                }
                                return [2 /*return*/];
                            });
                        }); });
                        if (!state_store_1.StateStore.currentPassword) {
                            state_store_1.StateStore.currentPassword = Buffer.from(newPassword);
                        }
                        this._encryptionProcess.send({
                            database: database,
                            newPassword: newPassword !== null && newPassword !== void 0 ? newPassword : state_store_1.StateStore.currentPassword,
                            memoryKey: state_store_1.StateStore.memoryKey,
                            type: __1.MessageEventType.EncryptDatabase
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    FileManagementService.prototype.openFile = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var dialog, fileObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('electron'); })];
                    case 1:
                        dialog = (_a.sent()).dialog;
                        return [4 /*yield*/, dialog.showOpenDialog(__assign({ properties: ['openFile'] }, this._fileFilters))];
                    case 2:
                        fileObj = _a.sent();
                        if (!fileObj.canceled) {
                            state_store_1.StateStore.fileMap.set(event.sender.id, fileObj.filePaths[0]);
                            event.reply(shared_models_1.IpcChannel.ProvidePassword, state_store_1.StateStore.fileMap.get(event.sender.id));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    FileManagementService.prototype.decryptDatabase = function (event, password) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                state_store_1.StateStore.currentPassword = Buffer.from(password);
                fs_1.readFile(state_store_1.StateStore.fileMap.get(event.sender.id), { encoding: 'base64' }, function (err, data) { return __awaiter(_this, void 0, void 0, function () {
                    var fileData, _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                fileData = data;
                                _a = this;
                                return [4 /*yield*/, this._encryptionService.createEncryptionProcess()];
                            case 1:
                                _a._encryptionProcess = _b.sent();
                                this._encryptionProcess.once('message', function (payload) {
                                    event.reply(shared_models_1.IpcChannel.DecryptedContent, {
                                        decrypted: payload.error ? undefined : payload.decrypted,
                                        file: state_store_1.StateStore.fileMap.get(event.sender.id)
                                    });
                                });
                                this._encryptionProcess.send({
                                    fileData: fileData,
                                    password: password,
                                    memoryKey: state_store_1.StateStore.memoryKey,
                                    type: __1.MessageEventType.DecryptDatabase
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    return FileManagementService;
}());
exports.FileManagementService = FileManagementService;
