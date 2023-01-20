import { ContentChildren, Directive, OnDestroy, QueryList } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MenuService } from '../services/menu.service';
import { DropdownDirective } from './dropdown.directive';

@Directive({
  selector: '[appMenu]',
  providers: [MenuService],
  host: {
    role: 'menubar'
  },
  standalone: true
})
export class MenuDirective implements OnDestroy {
  @ContentChildren(DropdownDirective) items: QueryList<DropdownDirective>;
  private readonly destroyed: Subject<void> = new Subject();

  constructor(private readonly menuService: MenuService) {}

  ngAfterViewInit() {
    this.menuService.items = this.items.toArray();
    this.menuService.currentItem = this.items.first;

    const dropdownCollection = this.items.toArray();

    for (let index = 0; index < dropdownCollection.length; index++) {
      dropdownCollection[index].setIndex(index);

      // close all other dropdowns when one opens
      dropdownCollection[index].state.stateChanges$.pipe(takeUntil(this.destroyed)).subscribe((state) => {
        if (state.isOpen) {
          dropdownCollection.filter(x => x.index !== index).forEach(x => x.state.close());
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }
}
