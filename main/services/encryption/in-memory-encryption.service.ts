import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { IEncryptionService } from './encryption-service.model';

export class InMemoryEncryptionService implements IEncryptionService {
  private readonly ALGORITHM_NAME = 'aes-128-gcm';
  private readonly ALGORITHM_NONCE_SIZE = 12;
  private readonly ALGORITHM_TAG_SIZE = 16;

  public encryptString(plaintext: string, key: string): string { 
    const ciphertextAndNonceAndSalt = Buffer.concat([ this.encrypt(Buffer.from(plaintext, 'utf8'), key) ]);
    return ciphertextAndNonceAndSalt.toString('base64');
  }
    
  public decryptString(base64CiphertextAndNonce: string, key: string): string {
    const ciphertextAndNonce = Buffer.from(base64CiphertextAndNonce, 'base64');      
    return this.decrypt(ciphertextAndNonce, key).toString('utf8');
  }
    
  private encrypt(plaintext, key): Buffer {
    const nonce = randomBytes(this.ALGORITHM_NONCE_SIZE);
    const cipher = createCipheriv(this.ALGORITHM_NAME, key, nonce);
    const ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    
    return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
  }
    
  private decrypt(ciphertextAndNonce, key): Buffer {
    const nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
    const ciphertext = ciphertextAndNonce.slice(
      this.ALGORITHM_NONCE_SIZE,
      ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE
    );

    const tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);
    const cipher = createDecipheriv(this.ALGORITHM_NAME, key, nonce);

    cipher.setAuthTag(tag);
    return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
  }
}