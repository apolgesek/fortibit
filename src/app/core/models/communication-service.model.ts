export interface ICommunicationService {
  ipcRenderer: {
    send: (...args) => void,
    on: (...args) => void,
    invoke: (...args) => Promise<any>,
    once: (...args) => Promise<any>,
    off: (...args) => any,
    [name: string]: any
  };

  getPlatform(): string;
  getPasswordGenerator(): any;
}