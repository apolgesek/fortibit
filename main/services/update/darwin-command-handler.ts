import { spawnSync } from "child_process";
import { app } from "electron";
import { ICommandHandler } from "./command-handler.model";

export class DarwinCommandHandler implements ICommandHandler {
  updateApp(filePath: string, updateDirectory: string) {
    spawnSync(`hdiutil attach ${filePath}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: updateDirectory,
      shell: true
    });
    
    spawnSync('rm -R /Applications/fortibit.app', { shell: true });
    spawnSync('cp -R /Volumes/fortibit/fortibit.app /Applications/fortibit.app', { shell: true });

    app.relaunch();
    app.exit();
  }
}