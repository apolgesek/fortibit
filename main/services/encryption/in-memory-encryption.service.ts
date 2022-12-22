import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { IEncryptionService } from './encryption-service.model';

const ALGORITHM_NAME = 'aes-256-gcm';
const ALGORITHM_NONCE_SIZE = 12;
const ALGORITHM_TAG_SIZE = 16;

export class InMemoryEncryptionService implements IEncryptionService {
  public encryptString(plaintext: string, key: string): string { 
    const ciphertextAndNonce = this.encrypt(Buffer.from(plaintext, 'utf8'), Buffer.from(key, 'base64'));
    return ciphertextAndNonce.toString('base64');
  }
    
  public decryptString(base64CiphertextAndNonce: string, key: string): string {
    const ciphertextAndNonce = Buffer.from(base64CiphertextAndNonce, 'base64'); 
    return this.decrypt(ciphertextAndNonce, Buffer.from(key, 'base64')).toString('utf8');
  }
    
  private encrypt(plaintext: Buffer, key: Buffer): Buffer {
    const nonce = randomBytes(ALGORITHM_NONCE_SIZE);
    const cipher = createCipheriv(ALGORITHM_NAME, key, nonce);
    const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
  }
    
  private decrypt(ciphertextAndNonce: Buffer, key: Buffer): Buffer {
    const nonce = ciphertextAndNonce.subarray(0, ALGORITHM_NONCE_SIZE);
    const ciphertext = ciphertextAndNonce.subarray(
      ALGORITHM_NONCE_SIZE,
      ciphertextAndNonce.length - ALGORITHM_TAG_SIZE
    );
    const tag = ciphertextAndNonce.subarray(ciphertext.length + ALGORITHM_NONCE_SIZE);
    const cipher = createDecipheriv(ALGORITHM_NAME, key, nonce);
    cipher.setAuthTag(tag);
    return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
  }
}