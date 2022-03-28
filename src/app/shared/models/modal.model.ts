import { ComponentRef } from '@angular/core';

export interface IModal {
  ref: ComponentRef<unknown>;
  additionalData?: IAdditionalData;
  close: () => void;
}

export interface IAdditionalData {
  event?: any;
  payload?: any;
  closeOnBackdropClick?: boolean;
}