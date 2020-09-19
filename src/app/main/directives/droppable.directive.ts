import { Directive, ElementRef, Renderer2 } from '@angular/core';
import { DomEventsService } from '@app/core/services';
import { StorageService } from '@app/core/services/storage.service';

@Directive({
  selector: '[appDroppable]'
})
// detect entries drag and drop on groups
export class DroppableDirective {

	private readonly uiTreenodeDragoverClassName = 'ui-treenode-dragover';
	private unlisteners: (() => void)[] = [];
	private el: HTMLElement;

	constructor(
		private element: ElementRef,
		private storageService: StorageService,
		private domEventsService: DomEventsService,
		private renderer: Renderer2
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
		this.unlisteners = [
			this.renderer.listen(this.el, 'dragenter', this.dragEnterCallback),
			this.renderer.listen(this.el, 'dragleave', this.dragLeaveCallback),
			this.renderer.listen(this.el, 'drop', this.dropCallback),
			this.renderer.listen(this.el, 'dragstart', (event: DragEvent) => {
				this.domEventsService.createDragGhost(event);
			}),
			this.renderer.listen(this.el, 'dragend', () => {
				this.removeDraggedOverClassForAllDroppables();
				this.domEventsService.removeDragGhost();
			})
		]
	}

	ngOnDestroy() {
		this.unlisteners.forEach(u => u());
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
