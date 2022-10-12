import { spawn } from "child_process";
import { ICommandHandler } from "./command-handler.model";

export class DarwinCommandHandler implements ICommandHandler {
  updateApp(filePath: string, updateDirectory: string) {
    spawn('');
  }
}