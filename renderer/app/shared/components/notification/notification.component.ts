import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, OnDestroy } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { IToastModel } from '@app/core/models';
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
export class NotificationComponent implements AfterViewInit, OnDestroy {
  public model!: IToastModel;
  public componentRef!: ComponentRef<NotificationComponent>;
  public timeLeft = 0;

  private animationStartTime = 0;
  private timer: any;

  constructor(
    private readonly element: ElementRef,
    private readonly notificationService: NotificationService,
  ) {}

  @HostListener('click')
  onClick() {
    this.notificationService.remove(this.componentRef);
  }

  @HostBinding('class.success')
  get successClass(): boolean {
    return this.model.type === 'success';
  }

  @HostBinding('class.error')
  get errorClass(): boolean {
    return this.model.type === 'error';
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

    element.style.transform = `translateX(50%) translateY(${(start - (distance * progress)).toFixed(2)}px)`;

    if (runtime < duration) {
      requestAnimationFrame((timestamp) => {
        this.slideIn(element, timestamp, start, distance, duration);
      });
    }
  }

  private progress(element: HTMLElement, timestamp: number, duration: number) {
    const runtime = timestamp - this.animationStartTime;
    let progress = (100 - ((runtime / duration) * 100)).toFixed(2);

    element.style.background = `linear-gradient(90deg, ${this.successClass ? 'var(--notification-success-bg)' : 'var(--notification-error-bg)'} ${progress}%, var(--notification-bg) ${progress}% 100%)`;

    if (runtime < duration) {
      requestAnimationFrame((timestamp) => {
        this.progress(element, timestamp, duration);
      });
    }
  }
}
