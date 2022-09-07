import { Directive, ElementRef, HostListener } from '@angular/core';
import { EntryManager, GroupManager } from '@app/core/services';
import { DomUtil } from '@app/utils';

@Directive({
  selector: '[appTreeNode]'
})
export class TreeNodeDirective {

  @HostListener('dragover', ['$event'])
  public onDragOver() {
    if (this.entryManager.draggedEntries.length === 0 && !this.groupManager.isGroupDragged) {
      this.el.nativeElement.classList.add(DomUtil.constants.unknownElementDraggingClass);
    } else {
      this.el.nativeElement.classList.remove(DomUtil.constants.unknownElementDraggingClass);
    }
  }

  @HostListener('dragleave')
  @HostListener('drop')
  public onDragLeave() {
    this.el.nativeElement.classList.remove(DomUtil.constants.unknownElementDraggingClass);
  }

  @HostListener('dragstart', ['$event'])
  public onDragStart(event: DragEvent) {
    this.groupManager.isGroupDragged = true;
    DomUtil.setDragGhost(event);
    this.el.nativeElement.classList.add(DomUtil.constants.isDraggingClass);
  }

  @HostListener('dragend')
  public onDragEnd() {
    this.groupManager.isGroupDragged = false;
    this.el.nativeElement.classList.remove(DomUtil.constants.isDraggingClass);
  }

  constructor(
    private el: ElementRef,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager
  ) { }
}
