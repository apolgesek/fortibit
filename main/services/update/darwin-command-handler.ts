import { spawnSync } from "child_process";
import { ICommandHandler } from "./command-handler.model";

export class DarwinCommandHandler implements ICommandHandler {
  updateApp(filePath: string, updateDirectory: string) {
    spawnSync(`hdiutil attach ${filePath}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: updateDirectory,
      shell: true
    });

    spawnSync('cp -R /Volumes/fortibit\ 1.1.0-arm64/fortibit.app /Applications');
    spawnSync('open /Applications/fortibit.app');
  }
}