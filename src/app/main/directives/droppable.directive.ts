import { Directive, ElementRef } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';

@Directive({
  selector: '[appDroppable]'
})
// detect entry/ies drag and drop on groups
export class DroppableDirective {

	private readonly uiTreenodeDragoverClassName = 'ui-treenode-dragover';

	private el: HTMLElement;

	constructor(
		private element: ElementRef,
		private storageService: StorageService
	) { }
	
	dragLeaveCallback: () => void = () => {
		if (!this.storageService.draggedEntry.length) {
			return;
		}

		this.el.classList.remove(this.uiTreenodeDragoverClassName);
	}

	dropCallback: () => void = () => {
		// this needs to be executed because dragend event is not called on drop
		document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
		this.removeDraggedOverClassForAllDroppables();
		if (this.storageService.draggedEntry.length) {
			this.storageService.moveEntry((<HTMLInputElement>this.el.querySelector('.node-id')).value);
			this.storageService.draggedEntry = [];
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
		Array.from(document.getElementsByClassName(this.uiTreenodeDragoverClassName))
			.forEach(el => el.classList.remove(this.uiTreenodeDragoverClassName));
	}

	private dragEnterCallback: () => void = () => {
		this.removeDraggedOverClassForAllDroppables();
		this.el.classList.add(this.uiTreenodeDragoverClassName);
	};
}
