import { Injectable } from '@angular/core';
import { DropdownDirective } from '../directives/dropdown.directive';

@Injectable()
export class MenuService {
  public items: DropdownDirective[];
  public currentItem: DropdownDirective;

  focusNext() {
    const currentItemIndex = this.currentItem.index;

    if (currentItemIndex >= this.items.length - 1) {
      return;
    }

    this.currentItem.state.closeRecursive(this.currentItem.state);

    this.currentItem = this.items[currentItemIndex + 1];
    this.currentItem.openDropdown();
  }

  focusPrevious() {
    const currentItemIndex = this.currentItem.index;

    if (currentItemIndex <= 0) {
      return;
    }

    this.currentItem.state.closeRecursive(this.currentItem.state);
  
    this.currentItem = this.items[currentItemIndex - 1];
    this.currentItem.openDropdown();
  }

  focus(instance: DropdownDirective) {
    if (typeof instance.index === 'number' && instance.index >= 0) {
      this.currentItem = instance;
    }
  }
}
