import { Directive, ElementRef, HostListener } from '@angular/core';
import { EntryManager, GroupManager } from '@app/core/services';
import { DomUtil } from '@app/utils';

@Directive({
  selector: '[appDroppable]',
  standalone: true
})
export class DroppableDirective {
  @HostListener('dragenter', ['$event'])
  public onDragOver() {
    if (this.entryManager.movedEntries.length === 0 && !this.groupManager.isGroupDragged) {
      this.el.nativeElement.classList.add(DomUtil.constants.unknownElementDraggingClass);
    } else {
      this.el.nativeElement.classList.add(DomUtil.constants.isDraggingOverClass);
      this.el.nativeElement.classList.remove(DomUtil.constants.unknownElementDraggingClass);
    }
  }

  @HostListener('dragleave')
  @HostListener('drop')
  public onDragLeave() {
    this.el.nativeElement.classList.remove(DomUtil.constants.unknownElementDraggingClass);
    this.el.nativeElement.classList.remove(DomUtil.constants.isDraggingOverClass);
  }

  constructor(
    private el: ElementRef,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager
  ) { }
}
