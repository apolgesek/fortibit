import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {DialogModule} from 'primeng/dialog';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import { DynamicDialogComponent } from 'primeng/dynamicdialog';
import {ConfirmationService} from 'primeng/api';

import {PasswordModule} from 'primeng/password';

import { PageNotFoundComponent } from './components/';
import { WebviewDirective } from './directives/';
import { FormsModule } from '@angular/forms';
import { SecondsPipe } from './pipes/seconds.pipe';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, SecondsPipe],
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
  providers: [MessageService, ConfirmationService],
  exports: [
    TranslateModule,
    WebviewDirective,
    FormsModule,
    BrowserAnimationsModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    SecondsPipe,
    PasswordModule
  ]
})
export class SharedModule {}
