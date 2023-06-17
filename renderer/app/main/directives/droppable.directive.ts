import { Directive, ElementRef, HostListener } from '@angular/core';
import { EntryManager, GroupManager } from '@app/core/services';
import { UiUtil } from '@app/utils';

@Directive({
  selector: '[appDroppable]',
  standalone: true
})
export class DroppableDirective {
  constructor(
    private el: ElementRef,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager
  ) { }

  @HostListener('dragenter', ['$event'])
  public onDragEnter() {
    if (this.entryManager.movedEntries.length === 0 && !this.groupManager.isGroupDragged) {
      this.el.nativeElement.classList.add(UiUtil.constants.unknownElementDraggingClass);
    } else {
      this.el.nativeElement.classList.add(UiUtil.constants.isDraggingOverClass);
      this.el.nativeElement.classList.remove(UiUtil.constants.unknownElementDraggingClass);
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
    this.el.nativeElement.classList.remove(UiUtil.constants.unknownElementDraggingClass);
    this.el.nativeElement.classList.remove(UiUtil.constants.isDraggingOverClass);
  }
}
