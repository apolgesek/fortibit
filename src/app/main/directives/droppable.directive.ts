import { Directive, ElementRef } from '@angular/core';
import { PasswordStoreService } from '@app/core/services/password-store.service';

@Directive({
  selector: '[appDroppable]'
})
export class DroppableDirective {

	private el: HTMLElement;

	constructor(
		private element: ElementRef,
		private passwordStore: PasswordStoreService
	) { }
	
	dragLeaveCallback: () => void = () => {
		if (!this.passwordStore.draggedEntry.length) {
			return;
		}
		this.el.classList.remove('ui-treenode-dragover');
	}

	dropCallback: () => void = () => {
		// this needs to be executed because dragend event is not called on drop
		document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
		this.removeDraggedOverClassForAllDroppables();
		if (this.passwordStore.draggedEntry.length) {
			this.passwordStore.moveEntry((<HTMLInputElement>this.el.querySelector('.node-id')).value);
			this.passwordStore.draggedEntry = [];
		}
	}

	ngOnInit() {
		this.el = this.element.nativeElement.parentElement.parentElement.parentElement;
		this.el.addEventListener('dragenter', this.dragEnterCallback);
		this.el.addEventListener('dragleave', this.dragLeaveCallback);
		this.el.addEventListener('drop', this.dropCallback);
		this.el.addEventListener('dragend', () => {
			this.removeDraggedOverClassForAllDroppables();
		});
	}

	ngOnDestroy() {
		this.el.removeEventListener('dragenter', this.dragEnterCallback);
		this.el.removeEventListener('dragleave', this.dragLeaveCallback);
		this.el.removeEventListener('drop', this.dropCallback);
		this.el.removeEventListener('dragend', () => {
			this.removeDraggedOverClassForAllDroppables();
		});
	}

	private removeDraggedOverClassForAllDroppables() {
		Array.from(document.getElementsByClassName('ui-treenode-dragover')).forEach(el => el.classList.remove('ui-treenode-dragover'));
	}

	private dragEnterCallback: () => void = () => {
		this.removeDraggedOverClassForAllDroppables();
		this.el.classList.add('ui-treenode-dragover');
	};
}
