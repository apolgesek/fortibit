export class ArrayUtils {
  public static swapElements<T>(array: T[], index1: number, index2: number) {
    [ array[index1], array[index2] ] = [ array[index2], array[index1] ];
  }

  public static moveElementsLeft<T>(array: T[], subarray: T[], uniqueProp: string) {
    subarray.sort((a, b) => {
      return array.findIndex(e => e[uniqueProp] === a[uniqueProp]) <= array.findIndex(e => e[uniqueProp] === b[uniqueProp]) ? -1 : 1
    });

    const isFirst = subarray.find(p => p[uniqueProp] === array[0][uniqueProp]);
    if (isFirst) {
      return;
    }

    subarray.forEach(element => {
      const elIdx = array.findIndex(e => e[uniqueProp] === element[uniqueProp]);
      this.swapElements<T>(array, elIdx - 1, elIdx);
    });
  }

  public static moveElementsRight<T>(array: T[], subarray: T[], uniqueProp: string) {
    subarray.sort((a, b) => {
      return array.findIndex(e => e[uniqueProp] === a[uniqueProp]) >= array.findIndex(e => e[uniqueProp] === b[uniqueProp]) ? -1 : 1
    });

    const isLast = subarray.find(p => p[uniqueProp] === array[subarray.length - 1][uniqueProp]);
    if (isLast) {
      return;
    }

    subarray.forEach(element => {
      const elIdx = array.findIndex(e => e[uniqueProp] === element[uniqueProp]);
      this.swapElements<T>(array, elIdx, elIdx + 1);
    });
  }
}