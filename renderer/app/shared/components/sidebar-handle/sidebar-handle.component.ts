import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostBinding, Inject, Input, NgZone, OnDestroy, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-sidebar-handle',
  template: '<div class="drag">',
  styleUrls: ['./sidebar-handle.component.scss'],
  standalone: true
})
export class SidebarHandleComponent implements AfterViewInit, OnDestroy {
  @HostBinding('class') public readonly class = 'handle';
  @Input() public readonly minWidth = 180;
  public isDragged = false;
  public container: HTMLElement;

  private unlisteners: (() => void)[] = [];
  private maxWidth = 600;

  constructor(
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
    private readonly zone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  @HostBinding('class.right')
  get isLeftSidebar(): boolean {
    const parentElement = this.el.nativeElement.parentElement as HTMLElement
    return parentElement.getBoundingClientRect().left === 0;
  }

  @HostBinding('class.left')
  get isRightSidebar(): boolean {
    return !this.isLeftSidebar;
  }

  ngAfterViewInit() {
    this.container = this.document.querySelector('.main-container') as HTMLElement;
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

  private setMaxWidth(left: number, right: number) {
    this.maxWidth = this.document.body.clientWidth - (this.isLeftSidebar ? right : left) - 300;
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isDragged) {
      return;
    }
    event.preventDefault();
    const { left, right } = this.getSidebarWidths();
    let mousePosition = event.pageX;

    if (!this.isLeftSidebar) {
      mousePosition = this.document.body.clientWidth - event.pageX;
    }

    let newWidth = this.isLeftSidebar ? left : right;
    const sidebarCurrentWidth = this.isLeftSidebar ? left : right;

    if (mousePosition === sidebarCurrentWidth) {
      return;
    } else if (mousePosition > sidebarCurrentWidth) {
      const difference = mousePosition - sidebarCurrentWidth;
      newWidth = (this.isLeftSidebar ? left : right) + difference;
    } else {
      const difference = sidebarCurrentWidth - mousePosition;
      newWidth = (this.isLeftSidebar ? left : right) - difference;
    }

    if (newWidth < this.minWidth) {
      newWidth = this.minWidth;
    }

    this.setMaxWidth(left, right);

    if (newWidth >= this.maxWidth) {
      newWidth = this.maxWidth;
    }

    const newStyle = [null, 'auto', null];
    const idx = this.isLeftSidebar ? 0 : 2;
    newStyle[idx] = Math.round(newWidth) + 'px';
    if (newStyle[0]) {
      newStyle[2] = right + 'px';
    } else {
      newStyle[0] = left + 'px';
    }

    this.renderer.setStyle(this.container, 'grid-template-columns', newStyle.join(' '));
  }

  private getAvailableHorizontalSpace(): number {
    const { left, right } = this.getSidebarWidths();

    return this.document.body.clientWidth
      - this.el.nativeElement.parentElement.offsetWidth
      - 300
      - (this.isLeftSidebar ? right : left);
  }

  private adjustSidebarWidth(availableSpace: number): void {
    const { left, right } = this.getSidebarWidths();
    const adjustedSidebarWidth = this.el.nativeElement.parentElement.offsetWidth - Math.abs(availableSpace);

    // if adjusted width is less than sidebar minWidth, subtract the difference from the other sidebar, so the main container has at least it's min width
    if (adjustedSidebarWidth < this.minWidth) {
      const difference = this.minWidth - adjustedSidebarWidth;
      const otherHandleWidth = this.isLeftSidebar ? right : left;

      const newStyle = this.getNewStyle(otherHandleWidth - difference, left, right);
      this.renderer.setStyle(this.container, 'grid-template-columns', newStyle.join(' '));
    }

    const newStyle = this.getNewStyle(adjustedSidebarWidth < this.minWidth ? this.minWidth : adjustedSidebarWidth, left, right);
    this.renderer.setStyle(this.container, 'grid-template-columns', newStyle.join(' '));
  }

  private getSidebarWidths(): { left: number, right: number } {
    const columns = getComputedStyle(this.container).gridTemplateColumns.split(' ');
    const left = parseInt(columns[0].replace('px',''));
    const right = parseInt(columns[2].replace('px',''));

    return { left, right };
  }

  private getNewStyle(size: number, left: number, right: number): (string | null)[] {
    const newStyle = [null, 'auto', null];
    const idx = this.isLeftSidebar ? 0 : 2;
    newStyle[idx] = size + 'px';
    if (newStyle[0]) {
      newStyle[2] = right + 'px';
    } else {
      newStyle[0] = left + 'px';
    }

    return newStyle;
  }
}
