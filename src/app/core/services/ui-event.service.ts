import { Injectable } from '@angular/core';
import { SidebarHandleDirective } from '@app/shared/directives/sidebar-handle.directive';

@Injectable({
  providedIn: 'root'
})
export class UiEventService {
  handles: SidebarHandleDirective[] = []

  constructor() { }

  registerSidebarHandle(handle: SidebarHandleDirective) {
    this.handles.push(handle);
  }
}
