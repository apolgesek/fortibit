import { ContentChildren, Directive, QueryList } from '@angular/core';
import { MenuService } from '../services/menu.service';
import { DropdownDirective } from './dropdown.directive';

@Directive({
  selector: '[appMenu]',
  providers: [MenuService],
  host: {
    role: 'menubar'
  }
})
export class MenuDirective {
  @ContentChildren(DropdownDirective) items: QueryList<DropdownDirective>;

  constructor(private readonly menuService: MenuService) {}

  ngAfterViewInit() {
    this.menuService.items = this.items.toArray();
    this.menuService.currentItem = this.items.first;

    const dropdownCollection = this.items.toArray();

    for (let index = 0; index < dropdownCollection.length; index++) {
      dropdownCollection[index].index = index;
    }
  }
}
