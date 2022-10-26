import { spawnSync } from "child_process";
import { ICommandHandler } from "./command-handler.model";

export class WindowsCommandHandler implements ICommandHandler {
  updateApp(filePath: string, updateDirectory: string) {
    spawnSync(filePath, ['/R'],
      {
        cwd: updateDirectory,
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsVerbatimArguments: true
      }
    );
  }
}