import { DOCUMENT } from '@angular/common';
import { ApplicationRef, ComponentRef, Directive, EmbeddedViewRef, HostListener, Inject, Input, Renderer2 } from '@angular/core';
import { AppViewContainer } from '@app/core/services';
import { fromEvent, race, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuItem } from '..';
import { ContextMenuComponent } from '../components/context-menu/context-menu.component';

@Directive({
  selector: '[appContextMenuItem]'
})
export class ContextMenuItemDirective {
  @Input('appContextMenuItem') model!: MenuItem[];
  private componentRef!: ComponentRef<ContextMenuComponent>;
  private destroyed: Subject<void> = new Subject();

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly renderer: Renderer2,
    private readonly appViewContainer: AppViewContainer,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: Event) {
    if (this.componentRef) {
      this.destroyMenu();
    }

    // allow browser to catch up with rendering
    setTimeout(() => {
      this.createContextMenu(event);
    });
  }

  private createContextMenu(event: Event): void {
    this.componentRef = this.appViewContainer.getRootViewContainer().createComponent(ContextMenuComponent);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    (<any>this.componentRef.instance).sourceEvent = event as Event;
    (<any>this.componentRef.instance).model = this.model;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const domElem = (this.componentRef.hostView as EmbeddedViewRef<ContextMenuComponent>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(this.document.body, domElem);

    race([
      fromEvent(this.document.body, 'click'),
      fromEvent(this.document.body, 'contextmenu')
    ]).pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.destroyMenu();
    });
  }

  private destroyMenu() {
    this.destroyed.next();
    this.destroyed.complete();

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
  }
}
