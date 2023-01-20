import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'link',
  standalone: true
})
export class LinkPipe implements PipeTransform {
  transform(value: string, ...args: unknown[]): string {
    return /^https?/.test(value) ? value.split('://')[1] : value;
  }
}
