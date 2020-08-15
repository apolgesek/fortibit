import { Directive, ElementRef } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';

@Directive({
  selector: '[appDroppable]'
})
// detect entry/ies drag and drop on groups
export class DroppableDirective {

	private el: HTMLElement;

	constructor(
		private element: ElementRef,
		private databaseService: DatabaseService
	) { }
	
	dragLeaveCallback: () => void = () => {
		if (!this.databaseService.draggedEntry.length) {
			return;
		}
		this.el.classList.remove('ui-treenode-dragover');
	}

	dropCallback: () => void = () => {
		// this needs to be executed because dragend event is not called on drop
		document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
		this.removeDraggedOverClassForAllDroppables();
		if (this.databaseService.draggedEntry.length) {
			this.databaseService.moveEntry((<HTMLInputElement>this.el.querySelector('.node-id')).value);
			this.databaseService.draggedEntry = [];
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
