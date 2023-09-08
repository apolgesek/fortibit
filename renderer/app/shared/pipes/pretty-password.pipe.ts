import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'prettyPassword',
  standalone: true
})
export class PrettyPasswordPipe implements PipeTransform {
  transform(value: string): string {
    return value.replaceAll(/([^a-z0-9])/gim, '<span class="pretty-special-char">$1</span>')
      .replaceAll(/([0-9])/gim, '<span class="pretty-digit">$1</span>');
  }
}
