import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {CardModule} from 'primeng/card';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {MessagesModule} from 'primeng/messages';
import {MessageModule} from 'primeng/message';
import {TableModule} from 'primeng/table';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextareaModule} from 'primeng/inputtextarea';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PasswordListComponent } from './password-list/password-list.component';
import { NewEntryComponent } from './new-entry/new-entry.component';
import { StopwatchDirective } from './dashboard/stopwatch.directive';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/api';
import { TextEmphasizeDirective } from './password-list/text-emphasize.directive';

@NgModule({
  declarations: [HomeComponent, DashboardComponent, PasswordListComponent, NewEntryComponent, StopwatchDirective, TextEmphasizeDirective],
  imports: [
    CommonModule,
    SharedModule,
    HomeRoutingModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
    ReactiveFormsModule,
    MessageModule,
    MessagesModule,
    ConfirmDialogModule,
    TableModule,
    DropdownModule
  ],
  providers: [ DialogService ],
  entryComponents: [NewEntryComponent]
})
export class HomeModule {}
