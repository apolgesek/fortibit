import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostBinding, Inject, Input, NgZone, OnDestroy, Renderer2 } from '@angular/core';
import { UiEventService } from '@app/core/services';
@Directive({
  selector: '[appSidebarHandle]',
  host: { 'class': 'handle' },
})
export class SidebarHandleDirective implements AfterViewInit, OnDestroy {
  @Input() public readonly position: 'left' | 'right' = 'left';
  @Input() readonly minWidth = 210;

  public isDragged = false;
  private unlisteners: (() => void)[] = [];
  private maxWidth = 600;

  constructor(
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
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
      const resize = this.renderer.listen(window, 'resize', this.onWindowResize.bind(this));

      this.unlisteners = [mouseDown, mouseUp, mouseMove, resize];
    });
  }

  ngOnDestroy(): void {
    this.unlisteners.forEach(u => u());
    this.unlisteners = [];
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
    this.renderer.addClass(this.el.nativeElement, 'active');
    this.document.body.style.cursor = 'w-resize';
    
    this.isDragged = true;
  }

  private onMouseUp() {
    if (this.isDragged) {
      this.renderer.removeClass(this.el.nativeElement, 'active');
      this.document.body.style.cursor = 'default';

      this.isDragged = false;
    }
  }

  private onWindowResize() {
    if (this.isRightSidebar) {
      this.maxWidth = this.document.body.clientWidth - (40 * 16);
      this.renderer.setStyle(this.el.nativeElement.parentElement, 'width', this.maxWidth + 'px');
    } else {
      this.maxWidth = 600;
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

    const parent = this.el.nativeElement.parentElement;
  
    let newWidth = parent.offsetWidth;
    const sidebarCurrentWidth = parent.offsetWidth;

    if (mousePosition === sidebarCurrentWidth) {
      return;
    } else if (mousePosition > sidebarCurrentWidth) {
      const difference = mousePosition - sidebarCurrentWidth;
      newWidth = parent.offsetWidth + difference;
    } else {
      const difference = sidebarCurrentWidth - mousePosition;
      newWidth = parent.offsetWidth - difference;
    }

    if (newWidth < this.minWidth) {
      newWidth = this.minWidth;
    }

    if (newWidth >= this.maxWidth) {
      newWidth = this.maxWidth;
    }

    this.renderer.setStyle(parent, 'width', Math.round(newWidth) + 'px');
  }
}
