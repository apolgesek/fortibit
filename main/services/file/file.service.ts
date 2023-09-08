import { createWriteStream, unlink } from 'fs';
import { request } from 'https';
import { IFileService } from './file-service.model';

const DOWNLOAD_PROGRESS_INTERVAL_MS = 100;

export class FileService implements IFileService {
  download(
    url: string,
    path: string,
    errorCallback: () => void,
    finishCallback: () => void,
    downloadCallback: (progress: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let receivedBytes = 0;
      let totalBytes = 0;
      let progress = '';
      let interval: NodeJS.Timer;

      if (downloadCallback) {
        interval = setInterval(() => {
          downloadCallback(progress);
        }, DOWNLOAD_PROGRESS_INTERVAL_MS);
      }

      const req = request(url, response => {
        if (response.statusCode && (response.statusCode >= 400 && response.statusCode < 500)) {
          clearInterval(interval);
          reject({ message: 'Failed to download a file.', code: response.statusCode });
          return;
        }

        if (response.statusCode == 302) {
          clearInterval(interval);
          resolve(this.download(response.headers.location, path, errorCallback, finishCallback, downloadCallback));
          return;
        }

        const file = createWriteStream(path);

        response.on('error', (err) => {
          clearInterval(interval);
          file.close();
          unlink(path, (err) => { console.log(err) });
          reject({ message: 'Error occured while downloading file.', code: null });
        });

        totalBytes = Number(response.headers['content-length']);

        response.on('data', (chunk) => {
          receivedBytes += chunk.length;
          file.write(chunk);
  
          if (downloadCallback) {
            progress = Math.floor((receivedBytes / totalBytes) * 100).toString();
          }
        });

        response.on('end', () => {
          clearInterval(interval);
          file.end(() => {
            finishCallback && finishCallback();
            resolve(path);
          });
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