import * as path from "path";

export interface ICommunicationService {
  os: { platform: () => string };
  ipcRenderer: {
    send: (...args) => void,
    on: (...args) => void,
    invoke: (...args) => Promise<any>,
    once: (...args) => Promise<any>,
    off: (...args) => any,
  };
  zxcvbn: (...args) => any;
  path: typeof path;
}