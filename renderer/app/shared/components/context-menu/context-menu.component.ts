import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject } from '@angular/core';
import { MenuItem } from '@app/shared';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ContextMenuComponent {
  public readonly model!: MenuItem[];
  private readonly sourceEvent!: MouseEvent;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly element: ElementRef,
  ) {}

  ngAfterViewInit() {
    this.positionElement(this.element.nativeElement);
    this.element.nativeElement.style.visibility = 'visible';
  }

  private positionElement(element: HTMLElement) {
    let top: string;

    if (element.offsetHeight <= this.document.body.clientHeight - this.sourceEvent.clientY) {
      top = this.sourceEvent.pageY + 'px';
    } else {
      top = this.sourceEvent.pageY - element.offsetHeight + 'px';
    }

    element.style.top = top;
    element.style.left = this.sourceEvent.pageX + 'px';
  }
}
