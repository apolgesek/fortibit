import {
	Directive,
	ElementRef,
	HostListener,
	Renderer2,
	inject,
} from '@angular/core';
import { EntryManager, GroupManager } from '@app/core/services';
import { UiUtil } from '@app/utils';

@Directive({
	selector: '[appDroppable]',
	standalone: true,
})
export class DroppableDirective {
	private readonly el = inject(ElementRef);
	private readonly renderer = inject(Renderer2);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);

	@HostListener('dragenter', ['$event'])
	public onDragEnter() {
		if (
			this.entryManager.movedEntries.length === 0 &&
			!this.groupManager.isGroupDragged
		) {
			this.renderer.addClass(
				this.el.nativeElement,
				UiUtil.constants.unknownElementDraggingClass,
			);
		} else {
			this.renderer.addClass(
				this.el.nativeElement,
				UiUtil.constants.isDraggingOverClass,
			);
			this.renderer.removeClass(
				this.el.nativeElement,
				UiUtil.constants.unknownElementDraggingClass,
			);
		}
	}

	// do not remove, required for drop to work
	@HostListener('dragover', ['$event'])
	public onDragOver(event: DragEvent) {
		event.preventDefault();
	}

	@HostListener('dragleave')
	@HostListener('drop')
	public onDragLeave() {
		this.renderer.removeClass(
			this.el.nativeElement,
			UiUtil.constants.unknownElementDraggingClass,
		);
		this.renderer.removeClass(
			this.el.nativeElement,
			UiUtil.constants.isDraggingOverClass,
		);
	}
}
