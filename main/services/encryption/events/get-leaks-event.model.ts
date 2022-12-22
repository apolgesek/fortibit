import { IEncryptionEvent } from "./event.model";

export interface IGetLeaksEvent extends IEncryptionEvent {
  database: string;
}