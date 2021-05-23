import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuBarComponent } from './components/index';
import { StopwatchDirective } from './components/clipboard-toast/stopwatch.directive';
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  declarations: [
    MenuBarComponent,
    StopwatchDirective,
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [
    MenuBarComponent,
    StopwatchDirective,
  ]
})
export class CoreModule { }
