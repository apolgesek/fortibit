import { ContentChildren, Directive, QueryList } from '@angular/core';
import { MenuService } from '../services/menu.service';
import { DropdownDirective } from './dropdown.directive';

@Directive({
  selector: '[appMenu]',
  providers: [MenuService]
})
export class MenuDirective {
  @ContentChildren(DropdownDirective) items: QueryList<DropdownDirective>;

  constructor(private readonly menuService: MenuService) {}

  ngAfterViewInit() {
    this.menuService.items = this.items.toArray();
    this.menuService.currentItem = this.items.first;
  }
}
