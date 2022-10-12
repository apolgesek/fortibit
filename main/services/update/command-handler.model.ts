import { createServiceDecorator } from "../../dependency-injection";

export const ICommandHandler = createServiceDecorator<ICommandHandler>('commandHandler');

export interface ICommandHandler {
  updateApp: (filePath: string, updateDirectory: string) => void;
}