import { Directive, HostBinding, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTab]'
})
export class TabDirective {
  @Input('appTab') templateRef!: TemplateRef<any>;

  // @HostBinding('class.active')
  // get active(): boolean {

  // }
}
