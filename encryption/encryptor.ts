const crypto = require('crypto');

export class Encryptor {

    // AES-256 Counter encryption mode
    private static readonly ALGORITHM_NAME = 'aes-256-gcm';
    private static readonly ALGORITHM_NONCE_SIZE = 12;
    private static readonly ALGORITHM_TAG_SIZE = 16;
    private static readonly ALGORITHM_KEY_SIZE = 32;
    private static readonly PBKDF2_NAME = "sha256";
    private static readonly PBKDF2_SALT_SIZE = 32;
    private static readonly PBKDF2_ITERATIONS = 100000;

    private constructor() {}

    public static encryptString(plaintext, password): string {
        // Generate a 128-bit salt using a CSPRNG.
        let salt = crypto.randomBytes(this.PBKDF2_SALT_SIZE);
      
        // Derive a key using PBKDF2.
        let key = crypto.pbkdf2Sync(
            Buffer.from(password, "utf8"),
            salt,
            this.PBKDF2_ITERATIONS,
            this.ALGORITHM_KEY_SIZE,
            this.PBKDF2_NAME
        );
      
        // Encrypt and prepend salt.
        let ciphertextAndNonceAndSalt = Buffer.concat([ salt, this.encrypt(Buffer.from(plaintext, "utf8"), key) ]);
      
        // Return as base64 string.
        return ciphertextAndNonceAndSalt.toString("base64");
    }
      
    public static decryptString(base64CiphertextAndNonceAndSalt, password): string {
        // Decode the base64.
        let ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, "base64");
      
        // Create buffers of salt and ciphertextAndNonce.
        let salt = ciphertextAndNonceAndSalt.slice(0, this.PBKDF2_SALT_SIZE);
        let ciphertextAndNonce = ciphertextAndNonceAndSalt.slice(this.PBKDF2_SALT_SIZE);
      
        // Derive the key using PBKDF2.
        let key = crypto.pbkdf2Sync(
            Buffer.from(password, "utf8"),
            salt,
            this.PBKDF2_ITERATIONS,
            this.ALGORITHM_KEY_SIZE,
            this.PBKDF2_NAME
        );
      
        // Decrypt and return result.
        return this.decrypt(ciphertextAndNonce, key).toString("utf8");
    }
      
    private static encrypt(plaintext, key): Buffer {
        // Generate a 96-bit nonce using a CSPRNG.
        let nonce = crypto.randomBytes(this.ALGORITHM_NONCE_SIZE);
      
        // Create the cipher instance.
        let cipher = crypto.createCipheriv(this.ALGORITHM_NAME, key, nonce);
      
        // Encrypt and prepend nonce.
        let ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
      
        return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
    }
      
    private static decrypt(ciphertextAndNonce, key): Buffer {
        // Create buffers of nonce, ciphertext and tag.
        let nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
        let ciphertext = ciphertextAndNonce.slice(
            this.ALGORITHM_NONCE_SIZE,
            ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE
        );
        let tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
      
        // Create the cipher instance.
        let cipher = crypto.createDecipheriv(this.ALGORITHM_NAME, key, nonce);
      
        // Decrypt and return result.
        cipher.setAuthTag(tag);
        return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
    }

}