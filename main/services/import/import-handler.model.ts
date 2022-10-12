import { IpcMainEvent } from "electron";
import { IImportMetadata } from "./handlers/import-metadata.model";

export interface IImportHandler {
  getMetadata(): Promise<IImportMetadata>;
  import(event: IpcMainEvent, path: string): Promise<string>;
}