import { InjectionToken } from '@angular/core';
import { ICommunicationService, IHotkeyHandler } from './app/core/models';

export const HotkeyHandler = new InjectionToken<IHotkeyHandler>('hotkeyHandler');
export const CommunicationService = new InjectionToken<ICommunicationService>('communicationService');