import { trigger, transition, style, animate } from "@angular/animations";

export function fade() {
    return trigger('fadeSlide', [
        transition(':enter', [
          style({opacity: 0, transform: 'translateY(-1rem)'}),
          animate('150ms', style({opacity: 1, transform: 'translateY(0)'})),
        ]),
  
        transition(':leave', [
          style({opacity: 1, transform: 'translateY(0)'}),
          animate('150ms', style({opacity: 0, transform: 'translateY(-1rem)'}))
        ])
    ]);
}