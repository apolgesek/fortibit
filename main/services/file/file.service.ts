import { IFileService } from './file-service.model';
import { request } from 'https';
import { createWriteStream, unlink } from 'fs';

export class FileService implements IFileService {
  download(url: string, path: string, errorCallback: () => void, finishCallback: () => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = request(url, response => {
        if (response.statusCode && (response.statusCode >= 400 && response.statusCode < 500)) {
          reject({ message: 'Failed to download a file.', code: response.statusCode });

          return;
        }

        if (response.statusCode == 302) {
          resolve(this.download(response.headers.location, path, errorCallback, finishCallback));
          return;
        }

        const file = createWriteStream(path);

        response.on('error', (err) => {
          file.close();
          unlink(path, (err) => { console.log(err) });
          reject({ message: 'Error occured while downloading file.', code: null });
        });

        const stream = response.pipe(file);

        stream.on('error', (err) => {
          errorCallback && errorCallback();
          reject({ message: 'Error occured while saving file.', code: null });
        });
    
        stream.on('finish', () => {
          finishCallback && finishCallback();
          resolve(path);
        });
      });

      req.on('error', () => {
        errorCallback && errorCallback();
        reject({ message: 'Error occured while downloading file.', code: null });
      });
  
      req.end();
    });
  }
}