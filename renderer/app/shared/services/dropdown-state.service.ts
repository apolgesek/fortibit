import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { MenuItemDirective } from '../directives/menu-item.directive';
import { MenuStateChange } from '../models/menu-state-change.model';

@Injectable()
export class DropdownStateService {
	public currentItem?: MenuItemDirective;
	public items: MenuItemDirective[];
	public closeOnSelect = false;
	public parent: DropdownStateService;
	public child: DropdownStateService;

	public readonly stateChanges$: Observable<MenuStateChange>;
	public readonly focusFirstItem$: Observable<void>;

	private readonly _stateChangesSource: BehaviorSubject<MenuStateChange> =
		new BehaviorSubject({ isOpen: false });
	private readonly _focusFirstSource: Subject<void> = new Subject();

	constructor() {
		this.stateChanges$ = this._stateChangesSource.asObservable();
		this.focusFirstItem$ = this._focusFirstSource.asObservable();
	}

	get isOpen(): boolean {
		return this._stateChangesSource.value.isOpen;
	}

	open(): void {
		this._stateChangesSource.next({ isOpen: true });
	}

	close(): void {
		this._stateChangesSource.next({ isOpen: false });
	}

	closeRecursive(node: DropdownStateService) {
		const child = node.child;

		if (child) {
			child.closeRecursive(child);
		}

		node.close();
	}

	closeTree(node: DropdownStateService) {
		const root = this.getTreeRoot(node);
		root.closeRecursive(root);
	}

	closeAndFocusFirst(): void {
		this.close();

		if (this.parent) {
			this.focusFirstItem();
		}
	}

	focusFirstItem() {
		this._focusFirstSource.next();
	}

	private getTreeRoot(node: DropdownStateService): DropdownStateService {
		if (node.parent) {
			return this.getTreeRoot(node.parent);
		} else {
			return node;
		}
	}
}
