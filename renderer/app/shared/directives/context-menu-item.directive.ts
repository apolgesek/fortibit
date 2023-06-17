import { DOCUMENT } from '@angular/common';
import { ApplicationRef, ComponentRef, DestroyRef, Directive, EmbeddedViewRef, HostListener, Inject, Input, OnInit, Renderer2 } from '@angular/core';
import { AppViewContainer } from '@app/core/services';
import { fromEvent, race } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { MenuItem } from '..';
import { ContextMenuComponent } from '../components/context-menu/context-menu.component';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[appContextMenuItem]',
  standalone: true
})
export class ContextMenuItemDirective implements OnInit {
  @Input('appContextMenuItem') model!: MenuItem[];
  private componentRef!: ComponentRef<ContextMenuComponent>;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly appRef: ApplicationRef,
    private readonly renderer: Renderer2,
    private readonly appViewContainer: AppViewContainer,
    private readonly router: Router,
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

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.destroyMenu();
      });
  }

  private createContextMenu(event: Event): void {
    this.componentRef = this.appViewContainer.getRootViewContainer().createComponent(ContextMenuComponent);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    (this.componentRef.instance as any).sourceEvent = event as Event;
    (this.componentRef.instance as any).model = this.model;
    (this.componentRef.instance as any).destroy = () => this.destroyMenu();
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const componentNode = (this.componentRef.hostView as EmbeddedViewRef<ContextMenuComponent>)
      .rootNodes[0] as HTMLElement;
    this.renderer.appendChild(this.document.body, componentNode);

    race([
      fromEvent(this.document.body, 'click'),
      fromEvent(this.document.body, 'contextmenu')
    ]).pipe(
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.destroyMenu();
    });
  }

  private destroyMenu() {
    if (!this.componentRef) {
      return;
    }

    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = null;
  }
}
