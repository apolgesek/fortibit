import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { Toast } from '@app/core/models';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule
  ]
})
export class NotificationComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('attr.role') public readonly role = 'alert';
  @HostBinding('attr.aria-live') public readonly ariaLive = 'off';

  public model!: Toast;
  public componentRef!: ComponentRef<NotificationComponent>;
  public timeLeft = 0;
  private animationStartTime = 0;
  private timer: any;

  constructor(
    private readonly element: ElementRef,
    private readonly notificationService: NotificationService,
  ) {}

  @HostBinding('class.success')
  get successClass(): boolean {
    return this.model.type === 'success';
  }

  @HostBinding('class.error')
  get errorClass(): boolean {
    return this.model.type === 'error';
  }

  @HostListener('click')
  onClick() {
    this.notificationService.remove(this.componentRef);
  }

  ngOnInit() {
    if (this.model.alive) {
      this.timeLeft = this.model.alive / 1000;

      this.timer = setInterval(() => {
        this.timeLeft--;

        if (this.timeLeft <= 0) {
          this.notificationService.remove(this.componentRef);
          clearInterval(this.timer);
        }
      }, 1000);
    }
  }

  ngAfterViewInit() {
    const rootElement = this.element.nativeElement as HTMLElement;
    rootElement.setAttribute('data-prevent-entry-deselect', '');

    if (this.model.showCount) {
      this.startProgress(rootElement);
    }

    this.startSlideIn(rootElement);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private startProgress(element: HTMLElement) {
    requestAnimationFrame((timestamp) => {
      this.animationStartTime = timestamp;
      const durationMs = this.model.alive;

      this.progress(element, timestamp, durationMs);
    });
  }

  private startSlideIn(element: HTMLElement) {
    requestAnimationFrame((timestamp) => {
      this.animationStartTime = timestamp;
      const elementHeight = element.offsetHeight;

      const startPos = elementHeight;
      const distance = elementHeight + 20;
      const durationMs = 150;

      this.slideIn(element, timestamp, startPos, distance, durationMs);
    });
  }

  private slideIn(element: HTMLElement, timestamp: number, start: number, distance: number, duration: number) {
    const runtime = timestamp - this.animationStartTime;
    let progress = runtime / duration;
    progress = Math.min(progress, 1);

    element.style.transform = `translateX(50%) translateY(${(start - (distance * progress)).toFixed(2)}px) translateZ(0)`;

    if (runtime < duration) {
      requestAnimationFrame((time) => {
        this.slideIn(element, time, start, distance, duration);
      });
    }
  }

  private progress(element: HTMLElement, timestamp: number, duration: number) {
    const runtime = timestamp - this.animationStartTime;
    const progress = (100 - ((runtime / duration) * 100)).toFixed(2);

    const bgClass = this.successClass ? 'var(--notification-bg--success)' : 'var(--notification-bg--error)';
    element.style.background = `linear-gradient(90deg, ${bgClass} ${progress}%,`
      + `var(--notification-bg) ${progress}% 100%)`;

    if (runtime < duration) {
      requestAnimationFrame((time) => {
        this.progress(element, time, duration);
      });
    }
  }
}
