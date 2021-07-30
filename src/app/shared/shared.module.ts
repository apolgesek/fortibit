import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { DropdownDirective } from './directives/dropdown.directive';
import { ModalComponent } from './index';
@NgModule({
  declarations: [DropdownDirective, ModalComponent],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    TranslateModule,
    FormsModule,
  ],
  exports: [
    TranslateModule,
    BrowserAnimationsModule,
    FormsModule,
    DropdownDirective,
    ModalComponent
  ],
})
export class SharedModule {}
