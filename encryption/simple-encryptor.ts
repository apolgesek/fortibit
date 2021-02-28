import * as crypto from 'crypto';

export class SimpleEncryptor {
    private static readonly ALGORITHM_NAME = 'aes-128-gcm';
    private static readonly ALGORITHM_NONCE_SIZE = 12;
    private static readonly ALGORITHM_TAG_SIZE = 16;

    public static encryptString(plaintext, key: string): string { 
      const ciphertextAndNonceAndSalt = Buffer.concat([ this.encrypt(Buffer.from(plaintext, 'utf8'), key) ]);
      return ciphertextAndNonceAndSalt.toString('base64');
    }
      
    public static decryptString(base64CiphertextAndNonce, key: string): string {
      const ciphertextAndNonce = Buffer.from(base64CiphertextAndNonce, 'base64');      
      return this.decrypt(ciphertextAndNonce, key).toString('utf8');
    }
      
    private static encrypt(plaintext, key): Buffer {
      const nonce = crypto.randomBytes(this.ALGORITHM_NONCE_SIZE);
      const cipher = crypto.createCipheriv(this.ALGORITHM_NAME, key, nonce);
      const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
      
      return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
    }
      
    private static decrypt(ciphertextAndNonce, key): Buffer {
      const nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
      const ciphertext = ciphertextAndNonce.slice(
        this.ALGORITHM_NONCE_SIZE,
        ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE
      );

      const tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
      const cipher = crypto.createDecipheriv(this.ALGORITHM_NAME, key, nonce);

      cipher.setAuthTag(tag);
      return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
    }
}