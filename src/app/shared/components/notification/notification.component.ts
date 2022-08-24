import { AfterViewInit, Component, ComponentRef, ElementRef, HostBinding, HostListener, OnDestroy } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { IToastModel } from '@app/core/models';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements AfterViewInit, OnDestroy {
  public model!: IToastModel;
  public componentRef!: ComponentRef<NotificationComponent>;
  public timeLeft = 0;

  private animationStartTime = 0;
  private timer: NodeJS.Timeout | undefined;

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
          clearInterval(this.timer as NodeJS.Timeout);
        }
      }, 1000);
    }
  }

  ngAfterViewInit() {
    const rootElement = this.element.nativeElement as HTMLElement;
    rootElement.setAttribute('data-prevent-entry-deselect', '');
    this.slideIn(rootElement);
  }

  ngOnDestroy() {
    clearInterval(this.timer as NodeJS.Timeout);
  }

  private slideIn(element: HTMLElement) {
    requestAnimationFrame((timestamp) => {
      this.animationStartTime = timestamp;

      const startPos = 80;
      const distance = 100;
      const durationMs = 150;

      this.moveUp(element, timestamp, startPos, distance, durationMs);
    });
  }

  private moveUp(element: HTMLElement, timestamp: number, start: number, distance: number, duration: number) {
    const runtime = timestamp - this.animationStartTime;
    let progress = runtime / duration;

    progress = Math.min(progress, 1);

    element.style.transform = `translateX(50%) translateY(${(start - (distance * progress)).toFixed(2)}px)`;

    if (runtime < duration) {
      requestAnimationFrame((timestamp) => {
        this.moveUp(element, timestamp, start, distance, duration);
      });
    }
  }
}
