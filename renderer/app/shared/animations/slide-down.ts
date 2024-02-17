import { animate, style, transition, trigger } from '@angular/animations';

export const slideDown = trigger('slideDown', [
	transition(':enter', [
		style({ transform: 'translateY(-10px)', height: 'auto', opacity: 0 }),
		animate('80ms ease-in', style({ transform: 'translateY(0)', opacity: 1 })),
	]),

	transition(':leave', [
		animate('80ms ease-out', style({ transform: 'translateY(0)', opacity: 0 })),
	]),
]);
