import { ChildProcess } from 'child_process';
export interface IEncryptionService {
  encryptString(plaintext: string, key: string): string;
  decryptString(base64CiphertextAndNonce: string, key: string): string;
}

export interface IEncryptionProcessManager {
  createEncryptionProcess(): Promise<ChildProcess>;
}