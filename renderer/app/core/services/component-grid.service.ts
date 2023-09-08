import { Injectable } from '@angular/core';
import { SidebarHandleDirective } from '@app/shared/directives/sidebar-handle.directive';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
/** Grid component accessor used by directives to adjust html element dimensions, i.e sidebar handles */
export class ComponentGridService {
  public readonly minMainContainerWidth = 320;
  public readonly sidebarsRegistered$ = new Subject<void>();

  private _leftSidebar: SidebarHandleDirective;
  private _rightSidebar: SidebarHandleDirective;

  get leftSidebar(): SidebarHandleDirective {
    return this._leftSidebar;
  }

  get rightSidebar(): SidebarHandleDirective {
    return this._rightSidebar;
  }

  get isReady(): boolean {
    return Boolean(this._leftSidebar && this._rightSidebar);
  }

  get isIdle(): boolean {
    if (!this.isReady) {
      return true;
    }

    return !this._leftSidebar.isDragged
      && !this._rightSidebar.isDragged;
  }

  registerResizableSidebar(handle: SidebarHandleDirective): boolean {
    if (handle.isLeftSidebar) {
      if (this.leftSidebar) {
        throw new Error('Sidebar has been already registered (left).');
      }

      this._leftSidebar = handle;
    } else if (handle.isRightSidebar) {
      if (this.rightSidebar) {
        throw new Error('Sidebar has been already registered (right).');
      }

      this._rightSidebar = handle;
    }

    if (this.leftSidebar && this.rightSidebar) {
      this.sidebarsRegistered$.next();
    }

    return true;
  }

  unregisterResizeableSidebar(handle: SidebarHandleDirective) {
    if (handle.isLeftSidebar) {
      this._leftSidebar = null;
    } else if (handle.isRightSidebar) {
      this._rightSidebar = null;
    }
  }
}
