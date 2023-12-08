import { IpcMainEvent } from "electron";
import { ImportMetadata } from "./handlers/import-metadata.model";

export interface IImportHandler {
  getMetadata(): Promise<ImportMetadata>;
  import(event: IpcMainEvent, path: string): Promise<string>;
}