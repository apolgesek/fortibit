import { writeFileSync } from "fs";

export class CsvWriter {
  public static writeFile<T>(path: string, arr: T[], props?: (keyof T)[]) {
    if (!props) {
      props = Object.keys(arr[0]) as (keyof T)[];
    }

    const header = props.join(',');
    const rows = arr.map(obj => {
      const values = props.map(prop => obj[prop]);

      return values.join(',');
    });

    const content = `${header}\n${rows.join('\n')}`;
    writeFileSync(path, content);
  }
}