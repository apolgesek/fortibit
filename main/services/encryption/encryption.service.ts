import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { IEncryptionService } from './encryption-service.model';

// AES-256 Galois/Counter encryption mode
const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_NONCE_SIZE = 12;
const ALGORITHM_TAG_SIZE = 16;
// scrypt KDF parameters
const KDF_KEY_SIZE = 32;
const KDF_SALT_SIZE = 32;

export class EncryptionService implements IEncryptionService {
  public encryptString(plaintext: string, password: string): string { 
    const salt = this.getRandomBytes();
    const key = this.createKeyFromPassword(password, salt);
    // Encrypt and prepend salt.
    const ciphertextAndNonceAndSalt = Buffer.concat([ salt, this.encrypt(Buffer.from(plaintext, 'utf8'), key) ]);
    // Return as base64 string.
    return ciphertextAndNonceAndSalt.toString('base64');
  }
      
  public decryptString(base64CiphertextAndNonceAndSalt: string, password: string): string {
    // Decode the base64.
    const ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, 'base64');
    // Create buffers of salt and ciphertextAndNonce.
    const salt = ciphertextAndNonceAndSalt.subarray(0, KDF_SALT_SIZE);
    const ciphertextAndNonce = ciphertextAndNonceAndSalt.subarray(KDF_SALT_SIZE);
    // Derive the key using scrypt.
    const key = this.createKeyFromPassword(password, salt);
    
    // Decrypt and return result.
    return this.decrypt(ciphertextAndNonce, key).toString('utf8');
  }
      
  private encrypt(plaintext: Buffer, key: Buffer): Buffer {
    // Generate a 96-bit nonce using a CSPRNG.
    const nonce = randomBytes(ALGORITHM_NONCE_SIZE);
    // Create the cipher instance.
    const cipher = createCipheriv(ALGORITHM_NAME, key, nonce);
    // Encrypt and prepend nonce.
    const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    
    return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
  }
    
  private decrypt(ciphertextAndNonce: Buffer, key: Buffer): Buffer {
    // Create buffers of nonce, ciphertext and tag.
    const nonce = ciphertextAndNonce.subarray(0, ALGORITHM_NONCE_SIZE);
    const ciphertext = ciphertextAndNonce.subarray(
      ALGORITHM_NONCE_SIZE,
      ciphertextAndNonce.length - ALGORITHM_TAG_SIZE
    );
    const tag = ciphertextAndNonce.slice(ciphertext.length + ALGORITHM_NONCE_SIZE);
    
    // Create the cipher instance.
    const cipher = createDecipheriv(ALGORITHM_NAME, key, nonce);
    
    // Decrypt and return result.
    cipher.setAuthTag(tag);
    return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
  }

  private getRandomBytes(length: number = KDF_SALT_SIZE): Buffer {
    return randomBytes(length);
  }

  private createKeyFromPassword(password: string, salt: Buffer): Buffer {
    const key = scryptSync(
      Buffer.from(password),
      salt,
      KDF_KEY_SIZE,
      {
        N: 2**14,
        r: 8,
        p: 1,
      }
    );

    return key;
  }
}