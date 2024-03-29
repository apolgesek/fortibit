import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { IEncryptionService } from './encryption-service.model';

const ALGORITHM_NAME = 'aes-128-gcm';
const ALGORITHM_NONCE_SIZE = 12;
const ALGORITHM_TAG_SIZE = 16;

export class InMemoryEncryptionService implements IEncryptionService {
  public encryptString(plaintext: string, key: string): string { 
    const ciphertextAndNonceAndSalt = Buffer.concat([ this.encrypt(Buffer.from(plaintext, 'utf8'), key) ]);
    return ciphertextAndNonceAndSalt.toString('base64');
  }
    
  public decryptString(base64CiphertextAndNonce: string, key: string): string {
    const ciphertextAndNonce = Buffer.from(base64CiphertextAndNonce, 'base64');      
    return this.decrypt(ciphertextAndNonce, key).toString('utf8');
  }
    
  private encrypt(plaintext, key): Buffer {
    const nonce = randomBytes(ALGORITHM_NONCE_SIZE);
    const cipher = createCipheriv(ALGORITHM_NAME, key, nonce);
    const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    
    return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
  }
    
  private decrypt(ciphertextAndNonce, key): Buffer {
    const nonce = ciphertextAndNonce.slice(0, ALGORITHM_NONCE_SIZE);
    const ciphertext = ciphertextAndNonce.slice(
      ALGORITHM_NONCE_SIZE,
      ciphertextAndNonce.length - ALGORITHM_TAG_SIZE
    );

    const tag = ciphertextAndNonce.slice(ciphertext.length + ALGORITHM_NONCE_SIZE);
    const cipher = createDecipheriv(ALGORITHM_NAME, key, nonce);

    cipher.setAuthTag(tag);
    return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
  }
}