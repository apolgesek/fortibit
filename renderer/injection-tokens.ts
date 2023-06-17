import { InjectionToken } from '@angular/core';
import { IMessageBroker, IHotkeyHandler } from './app/core/models';

export const HotkeyHandler = new InjectionToken<IHotkeyHandler>('hotkeyHandler');
export const MessageBroker = new InjectionToken<IMessageBroker>('messageBroker');
