"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require('crypto');
var Encryptor = /** @class */ (function () {
    function Encryptor() {
    }
    Encryptor.encryptString = function (plaintext, password) {
        // Generate a 128-bit salt using a CSPRNG.
        var salt = crypto.randomBytes(this.PBKDF2_SALT_SIZE);
        // Derive a key using PBKDF2.
        var key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, this.PBKDF2_ITERATIONS, this.ALGORITHM_KEY_SIZE, this.PBKDF2_NAME);
        // Encrypt and prepend salt.
        var ciphertextAndNonceAndSalt = Buffer.concat([salt, this.encrypt(Buffer.from(plaintext, "utf8"), key)]);
        // Return as base64 string.
        return ciphertextAndNonceAndSalt.toString("base64");
    };
    Encryptor.decryptString = function (base64CiphertextAndNonceAndSalt, password) {
        // Decode the base64.
        var ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, "base64");
        // Create buffers of salt and ciphertextAndNonce.
        var salt = ciphertextAndNonceAndSalt.slice(0, this.PBKDF2_SALT_SIZE);
        var ciphertextAndNonce = ciphertextAndNonceAndSalt.slice(this.PBKDF2_SALT_SIZE);
        // Derive the key using PBKDF2.
        var key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, this.PBKDF2_ITERATIONS, this.ALGORITHM_KEY_SIZE, this.PBKDF2_NAME);
        // Decrypt and return result.
        return this.decrypt(ciphertextAndNonce, key).toString("utf8");
    };
    Encryptor.encrypt = function (plaintext, key) {
        // Generate a 96-bit nonce using a CSPRNG.
        var nonce = crypto.randomBytes(this.ALGORITHM_NONCE_SIZE);
        // Create the cipher instance.
        var cipher = crypto.createCipheriv(this.ALGORITHM_NAME, key, nonce);
        // Encrypt and prepend nonce.
        var ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]);
    };
    Encryptor.decrypt = function (ciphertextAndNonce, key) {
        // Create buffers of nonce, ciphertext and tag.
        var nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
        var ciphertext = ciphertextAndNonce.slice(this.ALGORITHM_NONCE_SIZE, ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE);
        var tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
        // Create the cipher instance.
        var cipher = crypto.createDecipheriv(this.ALGORITHM_NAME, key, nonce);
        // Decrypt and return result.
        cipher.setAuthTag(tag);
        return Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    };
    // AES-256 Counter encryption mode
    Encryptor.ALGORITHM_NAME = 'aes-256-gcm';
    Encryptor.ALGORITHM_NONCE_SIZE = 12;
    Encryptor.ALGORITHM_TAG_SIZE = 16;
    Encryptor.ALGORITHM_KEY_SIZE = 32;
    Encryptor.PBKDF2_NAME = "sha256";
    Encryptor.PBKDF2_SALT_SIZE = 32;
    Encryptor.PBKDF2_ITERATIONS = 100000;
    return Encryptor;
}());
exports.Encryptor = Encryptor;
//# sourceMappingURL=encryptor.js.map