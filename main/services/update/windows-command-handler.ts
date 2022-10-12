import { spawn } from "child_process";
import { ICommandHandler } from "./command-handler.model";

export class WindowsCommandHandler implements ICommandHandler {
  updateApp(filePath: string, updateDirectory: string) {
    spawn(filePath, ['/R'],
      {
        cwd: updateDirectory,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsVerbatimArguments: true
      }
    );
  }
}