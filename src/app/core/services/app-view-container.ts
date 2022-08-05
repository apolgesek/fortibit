import { Injectable, ViewContainerRef } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AppViewContainer {
  private _appViewContainerRef: ViewContainerRef;

  set appViewContainerRef(value: ViewContainerRef) {
    this._appViewContainerRef = value;
  }

  public getRootViewContainer(): ViewContainerRef {
    return this._appViewContainerRef;
  }
}