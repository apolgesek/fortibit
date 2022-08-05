import { createServiceDecorator } from "../../dependency-injection";

export const IFileService = createServiceDecorator<IFileService>('fileService');

export interface IFileService {
  download(url: string, path: string, errorCallback?: () => void, finishCallback?: () => void): Promise<string>;
}