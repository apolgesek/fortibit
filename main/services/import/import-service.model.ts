import { ImportHandler } from "../../../shared-models";
import { createServiceDecorator } from "../../dependency-injection";
import { IImportHandler } from "./import-handler.model";

export const IImportService = createServiceDecorator<IImportService>('importService');

export interface IImportService {
  setHandler(type: ImportHandler);
  getHandler(): IImportHandler;
}