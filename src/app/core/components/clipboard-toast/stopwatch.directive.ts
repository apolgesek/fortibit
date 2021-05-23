import { Directive, Input, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

@Directive({
  selector: '[appStopwatch]'
})
export class StopwatchDirective implements OnInit, AfterViewInit {

  @Input('appStopwatch') seconds = 0; 
  public secondsLeft = 0;
  
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private element: ElementRef,
    private toastService: MessageService,
  ) { }

  ngOnInit(): void {
    this.secondsLeft = this.seconds;
  }

  ngAfterViewInit() {
    this.updateCountdown();
    this.interval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.interval as NodeJS.Timeout);
  }

  private updateCountdown() {
    if (this.secondsLeft <= 0) {
      clearInterval(this.interval as NodeJS.Timeout);
      this.toastService.clear();
    }
    this.element.nativeElement.innerHTML = `Time left: ${this.secondsLeft / 1000}`;
    this.secondsLeft += -1000;
  }

}
