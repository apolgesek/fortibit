import { request } from "https";

export class LeakService {
  private readonly _apiUrl: string;

  constructor() {
    const productPath = '../../../product.json';
    const product = require(productPath);

    this._apiUrl = product.leakedPasswordsUrl;
  }

  public async findLeaks(entries: { id: any, hash: string }[]): Promise<{ id: any, occurrences: number }[]> {
    try {
      const result = await Promise.all(entries.map((e) => this.findLeak(e)));
      return Promise.resolve(result.flat());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private async findLeak(entry: { id: number, hash: string}): Promise<{ id: number, occurrences: number }> {
    const hashStart = entry.hash.slice(0, 5);
    const hashEnd = entry.hash.slice(5);

    return new Promise((resolve, reject) => {
      let body = ''

      const req = request(`${this._apiUrl}/${hashStart}`, res => {
        res.on('data', async (data: Buffer) => {
          body += data.toString();
        }); 

        res.on('end', () => {
          const foundEntry = body.match(new RegExp(`${hashEnd}:\\d+$`, 'gmi'));

          const entryObject = {
            id: entry.id,
            occurrences: 0
          };

          if (foundEntry) {
            entryObject.occurrences = parseInt(foundEntry[0].split(':')[1]);
          }

          resolve(entryObject);
        })
      }).on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }
}