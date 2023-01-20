import { ChildProcess, Serializable } from 'child_process';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IEncryptionEventWrapper = createServiceDecorator<IEncryptionEventWrapper>('encryptionEventWrapper');

export interface IEncryptionEventWrapper {
  processEventAsync(event: Serializable, encryptedKey: string): Promise<Serializable>;
  createEncryptionProcess(encryptedKey: string): Promise<ChildProcess>;
}