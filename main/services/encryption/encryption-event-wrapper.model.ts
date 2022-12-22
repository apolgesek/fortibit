import { ChildProcess, Serializable } from 'child_process';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IEncryptionEventWrapper = createServiceDecorator<IEncryptionEventWrapper>('encryptionEventWrapper');

export interface IEncryptionEventWrapper {
  processEventAsync(event: Serializable, key: string): Promise<Serializable>;
  createEncryptionProcess(): Promise<ChildProcess>;
}