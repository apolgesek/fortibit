import { ChildProcess, Serializable } from 'child_process';
import { createServiceDecorator } from '../../dependency-injection/create-service-decorator';

export const IEncryptionProcessService = createServiceDecorator<IEncryptionProcessService>('encryptionProcessService');

export interface IEncryptionProcessService {
  processEventAsync(event: Serializable): Promise<Serializable>;
  createEncryptionProcess(): Promise<ChildProcess>;
}