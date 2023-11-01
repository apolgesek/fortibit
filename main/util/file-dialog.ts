import { FileFilter, app } from 'electron';
import { IAppConfig } from '../../app-config';
import { ProcessArgument } from '../process-argument.enum';
import { join } from 'path';

type FileType = 'vaultExt' | 'csv' | 'xml';

export function getFileFilter(config: IAppConfig, fileType: FileType): FileFilter {
  let fileFilter = { name: 'Fortibit database file', extensions: [ config.fileExtension ]  }

  switch (fileType) {
    case 'csv':
      fileFilter = { name: 'Comma Separated Values File', extensions: ['csv'] };
      break;
    case 'xml':
      fileFilter = { name: 'Extensible Markup Language', extensions: ['xml'] };
    default:
      break;
  }

  return fileFilter;
}

export function getDefaultPath(config: IAppConfig, path: string): string {
  const pathParts: string[] = [];
  
  if (Boolean(app.commandLine.hasSwitch(ProcessArgument.E2E))) {
    pathParts.push(config.e2eFilesPath)
  }
  pathParts.push(path);

  return join(...pathParts);
}