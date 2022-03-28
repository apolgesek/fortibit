import { NgModule } from '@angular/core';
import { MenuBarComponent } from './components/index';
import { SharedModule } from '@app/shared/shared.module';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    MenuBarComponent,
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [
    MenuBarComponent,
  ]
})
export class CoreModule { }
