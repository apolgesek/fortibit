import { ComponentRef } from '@angular/core';

export interface IModal {
  ref: ComponentRef<unknown>;
  additionalData?: IAdditionalData;
}

export interface IAdditionalData {
  event?: unknown;
  payload?: unknown;
}