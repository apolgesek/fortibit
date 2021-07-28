"use strict";
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
exports.EncryptionService = void 0;
var crypto_1 = require("crypto");
var path_1 = require("path");
var EncryptionService = /** @class */ (function () {
    function EncryptionService() {
        // AES-256 Galois/Counter encryption mode
        this.ALGORITHM_NAME = 'aes-256-gcm';
        this.ALGORITHM_NONCE_SIZE = 12;
        this.ALGORITHM_TAG_SIZE = 16;
        // scrypt KDF parameters
        this.KEY_SIZE = 32;
        this.SALT_SIZE = 32;
        this._args = process.argv.slice(1);
        this._serve = this._args.some(function (val) { return val === '--serve'; });
    }
    EncryptionService.prototype.encryptString = function (plaintext, password) {
        var salt = this.getRandomBytes();
        var key = this.createKeyFromPassword(password, salt);
        // Encrypt and prepend salt.
        var ciphertextAndNonceAndSalt = Buffer.concat([salt, this.encrypt(Buffer.from(plaintext, 'utf8'), key)]);
        // Return as base64 string.
        return ciphertextAndNonceAndSalt.toString('base64');
    };
    EncryptionService.prototype.decryptString = function (base64CiphertextAndNonceAndSalt, password) {
        // Decode the base64.
        var ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, 'base64');
        // Create buffers of salt and ciphertextAndNonce.
        var salt = ciphertextAndNonceAndSalt.slice(0, this.SALT_SIZE);
        var ciphertextAndNonce = ciphertextAndNonceAndSalt.slice(this.SALT_SIZE);
        // Derive the key using PBKDF2.
        var key = this.createKeyFromPassword(password, salt);
        // Decrypt and return result.
        return this.decrypt(ciphertextAndNonce, key).toString('utf8');
    };
    EncryptionService.prototype.createEncryptionProcess = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fork, encryptionProcessPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
                    case 1:
                        fork = (_a.sent()).fork;
                        encryptionProcessPath = path_1.join(global['__basedir'], 'main/services/encryption/main.js');
                        return [2 /*return*/, fork(encryptionProcessPath, [], {
                                env: {
                                    'ELECTRON_RUN_AS_NODE': '1'
                                }
                            })];
                }
            });
        });
    };
    EncryptionService.prototype.encrypt = function (plaintext, key) {
        // Generate a 96-bit nonce using a CSPRNG.
        var nonce = crypto_1.randomBytes(this.ALGORITHM_NONCE_SIZE);
        // Create the cipher instance.
        var cipher = crypto_1.createCipheriv(this.ALGORITHM_NAME, key, nonce);
        // Encrypt and prepend nonce.
        var ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]);
    };
    EncryptionService.prototype.decrypt = function (ciphertextAndNonce, key) {
        // Create buffers of nonce, ciphertext and tag.
        var nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
        var ciphertext = ciphertextAndNonce.slice(this.ALGORITHM_NONCE_SIZE, ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE);
        var tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
        // Create the cipher instance.
        var cipher = crypto_1.createDecipheriv(this.ALGORITHM_NAME, key, nonce);
        // Decrypt and return result.
        cipher.setAuthTag(tag);
        return Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    };
    EncryptionService.prototype.getRandomBytes = function (length) {
        if (length === void 0) { length = this.SALT_SIZE; }
        return crypto_1.randomBytes(length);
    };
    EncryptionService.prototype.createKeyFromPassword = function (password, salt) {
        var key = crypto_1.scryptSync(Buffer.from(password), salt, this.KEY_SIZE, {
            N: Math.pow(2, 14),
            r: 8,
            p: 1,
        });
        return key;
    };
    return EncryptionService;
}());
exports.EncryptionService = EncryptionService;
