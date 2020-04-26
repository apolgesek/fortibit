import { Directive, Input, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

@Directive({
  selector: '[appStopwatch]'
})
export class StopwatchDirective implements OnInit, AfterViewInit {

  @Input('appStopwatch') seconds: number; 
  public remainingTime: number;
  
  private interval: NodeJS.Timeout;

  constructor(
    private element: ElementRef,
    private toastService: MessageService,
    ) { }

  ngOnInit(): void {
    this.remainingTime = this.seconds;
  }

  ngAfterViewInit() {
    this.updateCountdown();
    this.interval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  private updateCountdown() {
    if (this.remainingTime <= 0) {
      clearInterval(this.interval);
      this.toastService.clear();
    }
    this.element.nativeElement.innerHTML = `${this.remainingTime / 1000}`;
    this.remainingTime += -1000;
  }

}
