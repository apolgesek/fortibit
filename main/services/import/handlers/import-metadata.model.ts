import { ImportHandler } from "../../../../shared";

export interface IImportMetadata {
  filePath: string;
  size: number;
  type: ImportHandler;
}