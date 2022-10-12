import { ImportHandler } from "../../../../shared-models";

export interface IImportMetadata {
  filePath: string;
  size: number;
  type: ImportHandler;
}