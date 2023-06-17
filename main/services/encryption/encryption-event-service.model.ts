import { createServiceDecorator } from "../../dependency-injection/create-service-decorator";

export const IEncryptionEventService = createServiceDecorator<IEncryptionEventService>('encryptionEventService');

export interface IEncryptionEventService {
  getLeaks(database: string, key: string): Promise<{data: string | false, error: string}>;
  getWeakPasswords(database: string, key: string): Promise<{data: string | false, error: string}>;
  saveDatabase(database: string, password: string, key: string): Promise<{ encrypted: string }>;
  decryptDatabase(data: string, password: string, key: string): Promise<{ error: string, decrypted: string }>;
}