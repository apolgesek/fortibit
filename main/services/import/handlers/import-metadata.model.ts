import { ImportHandler } from "../../../../shared";

export type ImportMetadata = {
  filePath: string;
  size: number;
  type: ImportHandler;
}