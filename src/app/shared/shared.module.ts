import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BrowserAnimationsModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    PasswordModule
  ],
  providers: [
    MessageService,
    ConfirmationService
  ],
  exports: [
    TranslateModule,
    FormsModule,
    BrowserAnimationsModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    PasswordModule
  ]
})
export class SharedModule {}
