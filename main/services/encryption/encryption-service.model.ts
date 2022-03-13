import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IEncryptionService = createServiceDecorator<IEncryptionService>('performanceService');

export interface IEncryptionService {
  encryptString(plaintext: string, key: string): string;
  decryptString(base64CiphertextAndNonce: string, key: string): string;
}