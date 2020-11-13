import { Directive, Input, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { MessageService } from 'primeng-lts/api';

@Directive({
  selector: '[appStopwatch]'
})
export class StopwatchDirective implements OnInit, AfterViewInit {

  @Input('appStopwatch') seconds: number; 
  public secondsLeft: number;
  
  private interval: NodeJS.Timeout;

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
    clearInterval(this.interval);
  }

  private updateCountdown() {
    if (this.secondsLeft <= 0) {
      clearInterval(this.interval);
      this.toastService.clear();
    }
    this.element.nativeElement.innerHTML = `Time left: ${this.secondsLeft / 1000}`;
    this.secondsLeft += -1000;
  }

}
