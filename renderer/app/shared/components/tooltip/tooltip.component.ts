import { Component, ElementRef } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: true,
})
export class TooltipComponent {
  public text: string;
  public triggerElement: HTMLElement;
  public container: 'default' | 'body';

  private readonly marginPx = 5;

  constructor(private readonly element: ElementRef) { }

  ngOnInit() {
    if (!this.triggerElement) {
      throw new Error('Missing trigger element for a tooltip');
    }

    if (!this.container) {
      throw new Error('Container not specified for a tooltip');
    }
  }

  ngAfterViewInit() {
    this.positionElement(this.element.nativeElement);
    this.element.nativeElement.style.visibility = 'visible';
  }

  private positionElement(element: HTMLElement) {
    const triggerRect = this.triggerElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    let xPos: number;
    let yPos: number;

    if (this.container === 'default') {
      xPos = Math.round(this.triggerElement.offsetLeft + triggerRect.width / 2 - elementRect.width / 2);
      yPos = this.triggerElement.offsetTop + this.triggerElement.clientHeight + this.marginPx;
    } else {
      xPos = Math.round(triggerRect.left + triggerRect.width / 2 - elementRect.width / 2);
      yPos = triggerRect.top + this.triggerElement.clientHeight + this.marginPx;
    }

    element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
}
