import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostBinding, Inject, Input, NgZone, OnDestroy, Renderer2, SkipSelf } from '@angular/core';
import { UiEventService } from '@app/core/services';
@Directive({
  selector: '[appSidebarHandle]',
  host: { 'class': 'handle' },
})
export class SidebarHandleDirective implements AfterViewInit, OnDestroy {
  @Input() public readonly position: 'left' | 'right' = 'left';
  public isDragged = false;

  private readonly minWidth = 210;
  private maxWidth = 600;
  private unlisteners: (() => void)[] = [];

  constructor(
    private readonly renderer: Renderer2,
    @SkipSelf() private readonly el: ElementRef,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly uiEventService: UiEventService,
    private readonly zone: NgZone
  ) {
    this.uiEventService.registerSidebarHandle(this);
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const mouseDown = this.renderer.listen(this.el.nativeElement, 'mousedown', this.onMouseDown.bind(this));
      const mouseUp = this.renderer.listen(this.document, 'mouseup', this.onMouseUp.bind(this));
      const mouseMove = this.renderer.listen(this.document, 'mousemove', this.onMouseMove.bind(this));

      this.unlisteners = [mouseDown, mouseUp, mouseMove];
    });
  }

  ngOnDestroy(): void {
    this.unlisteners.forEach(u => u());
    this.unlisteners = [];
  }

  @HostBinding('class.active')
  get active(): boolean {
    if (this.isDragged) {
      this.document.body.style.cursor = 'w-resize';
    } else {
      this.document.body.style.cursor = 'default';
    }

    return this.isDragged;
  }

  @HostBinding('class.right')
  get isLeftSidebar(): boolean {
    return this.position === 'right';
  }

  @HostBinding('class.left')
  get isRightSidebar(): boolean {
    return this.position === 'left';
  }

  private onMouseDown() {
    this.isDragged = true;
  }

  private onMouseUp() {
    if (this.isDragged) {
      this.isDragged = false;
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragged) {
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

    if (newWidth >= this.maxWidth) {
      newWidth = this.maxWidth
    }

    this.renderer.setStyle(this.el.nativeElement, 'width', Math.round(newWidth) + 'px');
  }
}
