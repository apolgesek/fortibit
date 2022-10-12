import { IFileService } from './file-service.model';
import { request } from 'https';
import { createWriteStream, unlink } from 'fs';

export class FileService implements IFileService {
  download(url: string, path: string, errorCallback: () => void, finishCallback: () => void): Promise<string> {
    console.log(url, path);

    return new Promise((resolve, reject) => {
      const req = request(url, response => {
        if (response.statusCode && (response.statusCode > 400 && response.statusCode < 500)) {
          reject('Failed to download a file.');

          return;
        }

        const file = createWriteStream(path);

        response.on('error', (err) => {
          file.close();
          unlink(path, (err) => { console.log(err) });

          reject('Error occured while downloading file.');
        });

        const stream = response.pipe(file);

        stream.on('error', (err) => {
          errorCallback && errorCallback();

          reject('Error occured while saving file.');
        });
    
        stream.on('finish', () => {
          finishCallback && finishCallback();

          resolve(path);
        });
      });

      req.on('error', () => {
        errorCallback && errorCallback();

        reject('Error occured while downloading file');
      });
  
      req.end();
    });
  }
}