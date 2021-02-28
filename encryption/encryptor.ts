import * as crypto from 'crypto';
export class Encryptor {
    // AES-256 Galois/Counter encryption mode
    private static readonly ALGORITHM_NAME = 'aes-256-gcm';
    private static readonly ALGORITHM_NONCE_SIZE = 12;
    private static readonly ALGORITHM_TAG_SIZE = 16;
    // scrypt KDF parameters
    private static readonly KEY_SIZE = 32;
    private static readonly SALT_SIZE = 32;

    public static getRandomBytes(length = this.SALT_SIZE): Buffer {
      return crypto.randomBytes(length);
    }

    public static encryptString(plaintext, password: string): string { 
      const salt = this.getRandomBytes();
      const key = this.createKeyFromPassword(password, salt);
      // Encrypt and prepend salt.
      const ciphertextAndNonceAndSalt = Buffer.concat([ salt, this.encrypt(Buffer.from(plaintext, 'utf8'), key) ]);
      
      // Return as base64 string.
      return ciphertextAndNonceAndSalt.toString('base64');
    }
      
    public static decryptString(base64CiphertextAndNonceAndSalt, password: string): string {
      // Decode the base64.
      const ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, 'base64');
      // Create buffers of salt and ciphertextAndNonce.
      const salt = ciphertextAndNonceAndSalt.slice(0, this.SALT_SIZE);
      const ciphertextAndNonce = ciphertextAndNonceAndSalt.slice(this.SALT_SIZE);
      // Derive the key using PBKDF2.
      const key = this.createKeyFromPassword(password, salt);
      
      // Decrypt and return result.
      return this.decrypt(ciphertextAndNonce, key).toString('utf8');
    }
      
    private static encrypt(plaintext, key): Buffer {
      // Generate a 96-bit nonce using a CSPRNG.
      const nonce = crypto.randomBytes(this.ALGORITHM_NONCE_SIZE);
      // Create the cipher instance.
      const cipher = crypto.createCipheriv(this.ALGORITHM_NAME, key, nonce);
      // Encrypt and prepend nonce.
      const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
      
      return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
    }
      
    private static decrypt(ciphertextAndNonce, key): Buffer {
      // Create buffers of nonce, ciphertext and tag.
      const nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
      const ciphertext = ciphertextAndNonce.slice(
        this.ALGORITHM_NONCE_SIZE,
        ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE
      );
      const tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
      
      // Create the cipher instance.
      const cipher = crypto.createDecipheriv(this.ALGORITHM_NAME, key, nonce);
      
      // Decrypt and return result.
      cipher.setAuthTag(tag);
      return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
    }

    private static createKeyFromPassword(password: string, salt: Buffer): Buffer {
      const key = crypto.scryptSync(
        Buffer.from(password),
        salt,
        this.KEY_SIZE,
        {
          N: 2**14,
          r: 8,
          p: 1,
        }
      );

      return key;
    }
}