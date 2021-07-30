"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEncryptionService = void 0;
var crypto_1 = require("crypto");
var InMemoryEncryptionService = /** @class */ (function () {
    function InMemoryEncryptionService() {
        this.ALGORITHM_NAME = 'aes-128-gcm';
        this.ALGORITHM_NONCE_SIZE = 12;
        this.ALGORITHM_TAG_SIZE = 16;
    }
    InMemoryEncryptionService.prototype.encryptString = function (plaintext, key) {
        var ciphertextAndNonceAndSalt = Buffer.concat([this.encrypt(Buffer.from(plaintext, 'utf8'), key)]);
        return ciphertextAndNonceAndSalt.toString('base64');
    };
    InMemoryEncryptionService.prototype.decryptString = function (base64CiphertextAndNonce, key) {
        var ciphertextAndNonce = Buffer.from(base64CiphertextAndNonce, 'base64');
        return this.decrypt(ciphertextAndNonce, key).toString('utf8');
    };
    InMemoryEncryptionService.prototype.encrypt = function (plaintext, key) {
        var nonce = crypto_1.randomBytes(this.ALGORITHM_NONCE_SIZE);
        var cipher = crypto_1.createCipheriv(this.ALGORITHM_NAME, key, nonce);
        var ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]);
    };
    InMemoryEncryptionService.prototype.decrypt = function (ciphertextAndNonce, key) {
        var nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
        var ciphertext = ciphertextAndNonce.slice(this.ALGORITHM_NONCE_SIZE, ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE);
        var tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
        var cipher = crypto_1.createDecipheriv(this.ALGORITHM_NAME, key, nonce);
        cipher.setAuthTag(tag);
        return Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    };
    return InMemoryEncryptionService;
}());
exports.InMemoryEncryptionService = InMemoryEncryptionService;
