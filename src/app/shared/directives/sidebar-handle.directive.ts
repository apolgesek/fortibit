import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, HostBinding, HostListener, Inject, Input, Renderer2, SkipSelf } from '@angular/core';

@Directive({
  selector: '[appSidebarHandle]',
  host: { 'class': 'handle' }
})
export class SidebarHandleDirective {
  @Input() public readonly position: 'left' | 'right' = 'left';

  private readonly minWidth = 210;
  private start = false;

  constructor(
    private readonly renderer: Renderer2,
    @SkipSelf() private readonly el: ElementRef,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  @HostBinding('class.active')
  get active(): boolean {
    if (this.start) {
      this.document.body.style.cursor = 'w-resize';
    } else {
      this.document.body.style.cursor = 'default';
    }

    return this.start;
  }

  @HostBinding('class.right')
  get isLeftSidebar(): boolean {
    return this.position === 'right';
  }

  @HostBinding('class.left')
  get isRightSidebar(): boolean {
    return this.position === 'left';
  }

  @HostListener('mousedown', ['$event'])
  private onMouseDown() {
    this.start = true;
  }

  @HostListener('document:mouseup', ['$event'])
  private onMouseUp() {
    if (this.start) {
      this.start = false;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  private onMouseMove(event: MouseEvent) {
    if (!this.start) {
      return;
    }

    event.preventDefault();

    let mousePosition  = event.pageX;

    if (this.position === 'left') {
      mousePosition = this.document.body.clientWidth - event.pageX;
    }
  
    let newWidth = this.el.nativeElement.offsetWidth;

    const sidebarCurrentWidth = this.el.nativeElement.offsetWidth;

    if (mousePosition === sidebarCurrentWidth) {
      return;
    } else if (mousePosition > sidebarCurrentWidth) {
      const difference = mousePosition - sidebarCurrentWidth;
      newWidth = this.el.nativeElement.offsetWidth + difference;
    } else {
      const difference = sidebarCurrentWidth - mousePosition;
      newWidth = this.el.nativeElement.offsetWidth - difference;
    }

    if (newWidth < this.minWidth) {
      newWidth = this.minWidth;
    }

    this.renderer.setStyle(this.el.nativeElement, 'width', newWidth + 'px');
  }
}
