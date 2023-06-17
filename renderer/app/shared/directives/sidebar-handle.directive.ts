import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostBinding, Inject, Input, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ComponentGridService } from '@app/core/services';

@Directive({
  selector: '[appSidebarHandle]',
  standalone: true
})
export class SidebarHandleDirective implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class') public readonly class = 'handle';
  @Input() public readonly position: 'left' | 'right' = 'left';
  @Input() public readonly minWidth = 240;
  public isDragged = false;

  private unlisteners: (() => void)[] = [];
  private maxWidth = 600;

  constructor(
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
    private readonly componentGridService: ComponentGridService,
    private readonly zone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  @HostBinding('class.right')
  get isLeftSidebar(): boolean {
    return this.position === 'right';
  }

  @HostBinding('class.left')
  get isRightSidebar(): boolean {
    return this.position === 'left';
  }

  ngOnInit() {
    this.componentGridService.registerResizableSidebar(this);
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

    this.componentGridService.unregisterResizeableSidebar(this);
  }

  private onMouseDown() {
    this.renderer.addClass(this.el.nativeElement, 'active');
    this.document.body.classList.add('sidebar-drag');
    this.isDragged = true;
  }

  private onMouseUp() {
    if (this.isDragged) {
      this.renderer.removeClass(this.el.nativeElement, 'active');
      this.document.body.classList.remove('sidebar-drag');
      this.isDragged = false;
    }
  }

  private onWindowResize(): void {
    const availableSpace = this.getAvailableHorizontalSpace();

    if (availableSpace <= 0) {
      this.adjustSidebarWidth(availableSpace);
    }
  }

  private setMaxWidth() {
    const otherHandle = this.isLeftSidebar
      ? this.componentGridService.rightSidebar
      : this.componentGridService.leftSidebar;
    const otherHandleWidth = (otherHandle.el.nativeElement as HTMLElement).parentElement.offsetWidth;

    this.maxWidth = this.document.body.clientWidth - otherHandleWidth - this.componentGridService.minMainContainerWidth;
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragged) {
      return;
    }
    event.preventDefault();

    const parent = this.el.nativeElement.parentElement;
    let mousePosition = event.pageX;

    if (this.isRightSidebar) {
      mousePosition = this.document.body.clientWidth - event.pageX;
    }

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

    this.setMaxWidth();

    if (newWidth >= this.maxWidth) {
      newWidth = this.maxWidth;
    }

    this.renderer.setStyle(parent, 'width', Math.round(newWidth) + 'px');
  }

  private getAvailableHorizontalSpace(): number {
    return this.document.body.clientWidth
      - this.el.nativeElement.parentElement.offsetWidth
      - this.componentGridService.minMainContainerWidth
      - this.getOtherHandle().el.nativeElement.parentElement.offsetWidth;
  }

  private adjustSidebarWidth(availableSpace: number): void {
    const adjustedSidebarWidth = this.el.nativeElement.parentElement.offsetWidth - Math.abs(availableSpace);

    // if adjusted width is less than sidebar minWidth, subtract the difference from the other sidebar, so the main container has at least it's min width
    if (adjustedSidebarWidth < this.minWidth) {
      const difference = this.minWidth - adjustedSidebarWidth;
      const otherHandleWidth = this.getOtherHandle().el.nativeElement.parentElement.offsetWidth;
      this.renderer.setStyle(
        this.getOtherHandle().el.nativeElement.parentElement,
        'width',
        (otherHandleWidth - difference) + 'px'
      );
    }

    this.renderer.setStyle(
      this.el.nativeElement.parentElement,
      'width',
      (adjustedSidebarWidth < this.minWidth ? this.minWidth : adjustedSidebarWidth) + 'px'
    );
  }

  private getOtherHandle(): SidebarHandleDirective {
    return this.isLeftSidebar ? this.componentGridService.rightSidebar : this.componentGridService.leftSidebar;
  }
}
