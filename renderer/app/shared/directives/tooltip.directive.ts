import { AppViewContainer } from '@app/core/services';
import { ApplicationRef, ComponentRef, Directive, ElementRef, EmbeddedViewRef, HostListener, Inject, Input, Renderer2 } from '@angular/core';
import { TooltipComponent } from '../components/tooltip/tooltip.component';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective {
  @Input('appTooltip') public tooltipText: string; 
  // default is relative to parent positioning
  @Input() public container: 'default' | 'body' = 'default';

  private componentRef!: ComponentRef<TooltipComponent>;
  private timeout: NodeJS.Timeout;

  constructor(
    private readonly appViewContainer: AppViewContainer,
    private readonly elRef: ElementRef,
    private readonly renderer: Renderer2,
    private readonly appRef: ApplicationRef,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  @HostListener('mouseenter', ['$event'])
  public onMouseEnter() {
    if (!this.tooltipText?.trim()) {
      return;
    }

    this.timeout = setTimeout(() => {
      this.createTooltipComponent();
    }, 500);
  }

  @HostListener('mouseleave', ['$event'])
  public onMouseLeave() {
    if (this.componentRef) {
      this.destroyTooltipComponent();
    } else {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  createTooltipComponent() {
    this.componentRef = this.appViewContainer.getRootViewContainer().createComponent(TooltipComponent);
    this.componentRef.instance.triggerElement = this.elRef.nativeElement;
    this.componentRef.instance.text = this.tooltipText;
    this.componentRef.instance.container = this.container;

    const componentNode = (this.componentRef.hostView as EmbeddedViewRef<TooltipComponent>).rootNodes[0] as HTMLElement;
    const parent = this.container === 'default' ? (<HTMLElement>this.elRef.nativeElement).parentElement : this.document.body;
    this.renderer.appendChild(parent, componentNode);
  }

  destroyTooltipComponent() {
    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = null;
  }
}
