import { QueryList } from '@angular/core';
import { FocusableListItemDirective } from '../directives/focusable-list-item.directive';

export class ListStateService {
  rowEntries: QueryList<FocusableListItemDirective>;
  lastFocused: any;
  selected: any;

  constructor() { }
}
