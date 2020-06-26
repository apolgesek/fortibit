import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import {CardModule} from 'primeng/card';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {MessagesModule} from 'primeng/messages';
import {MessageModule} from 'primeng/message';
import {TableModule} from 'primeng/table';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextareaModule} from 'primeng/inputtextarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import {TreeModule} from 'primeng/tree';
import {TreeNode} from 'primeng/api';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PasswordListComponent } from './password-list/password-list.component';
import { NewEntryComponent } from './new-entry/new-entry.component';
import { StopwatchDirective } from './dashboard/stopwatch.directive';

import {TreeDragDropService} from 'primeng/api';
import {ContextMenuModule} from 'primeng/contextmenu';
import {DragDropModule } from 'primeng/dragdrop';

import { TextEmphasizeDirective } from './password-list/text-emphasize.directive';
import { BlurEnterDirective } from './password-list/blur-enter.directive';
import { DroppableDirective } from './password-list/droppable.directive';
import { EntryDetailsComponent } from './entry-details/entry-details.component';
import { StickyHeaderDirective } from './password-list/sticky-header.directive';

@NgModule({
  declarations: [
    HomeComponent,
    DashboardComponent,
    PasswordListComponent,
    NewEntryComponent,
    StopwatchDirective,
    TextEmphasizeDirective,
    BlurEnterDirective,
    DroppableDirective,
    EntryDetailsComponent,
    StickyHeaderDirective
  ],
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
    DropdownModule,
    TreeModule,
    ContextMenuModule,
    DragDropModule
  ],
  providers: [ DialogService, TreeDragDropService ],
  entryComponents: [NewEntryComponent]
})
export class HomeModule {}
