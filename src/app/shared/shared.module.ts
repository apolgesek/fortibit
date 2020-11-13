import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng-lts/api';
import { ConfirmDialogModule } from 'primeng-lts/confirmdialog';
import { DialogModule } from 'primeng-lts/dialog';
import { PasswordModule } from 'primeng-lts/password';
import { ToastModule } from 'primeng-lts/toast';

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
