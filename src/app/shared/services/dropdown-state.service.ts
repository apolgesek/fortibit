import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, } from 'rxjs';
import { MenuItemDirective } from '../directives/menu-item.directive';
import { IMenuStateChange } from '../models/menu-state-change.model';

@Injectable()
export class DropdownStateService {
  public currentItem?: MenuItemDirective;
  public items: MenuItemDirective[];

  public parent: DropdownStateService;
  public child: DropdownStateService;

  public readonly stateChanges$: Observable<IMenuStateChange>;
  public readonly focusFirstItem$: Observable<void>;

  private readonly _stateChangesSource: BehaviorSubject<IMenuStateChange> = new BehaviorSubject({ isOpen: false, notifyChanges: false });
  private readonly _focusFirstSource: Subject<void> = new Subject();

  get isOpen(): boolean {
    return this._stateChangesSource.value.isOpen;
  }

  constructor() {
    this.stateChanges$ = this._stateChangesSource.asObservable();
    this.focusFirstItem$ = this._focusFirstSource.asObservable();
  }

  open(notifyChanges = true): void {
    this._stateChangesSource.next({ isOpen: true, notifyChanges });
  }

  close(notifyChanges = true): void {
    this.currentItem = undefined;
    this._stateChangesSource.next({ isOpen: false, notifyChanges });
  }

  closeRecursive(node: DropdownStateService) {
    const child = node.child;
  
    if (child) {
      child.closeRecursive(child);
    }

    node.close();
  }

  // closeRoot() {
  //   let root = this.getRoot(this);

  //   root.closeRecursive(root);
  // }

  // getRoot(node: DropdownStateService): DropdownStateService {
  //   const parent = node.parent;

  //   if (parent) {
  //     return parent.getRoot(parent);
  //   } else {
  //     return node;
  //   }
  // }

  focusFirstItem() {
    this._focusFirstSource.next();
  }
}
