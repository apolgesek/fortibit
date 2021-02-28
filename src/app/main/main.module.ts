import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TreeDragDropService } from 'primeng-lts/api';
import { ButtonModule } from 'primeng-lts/button';
import { CardModule } from 'primeng-lts/card';
import { ConfirmDialogModule } from 'primeng-lts/confirmdialog';
import { ContextMenuModule } from 'primeng-lts/contextmenu';
import { DragDropModule } from 'primeng-lts/dragdrop';
import { DropdownModule } from 'primeng-lts/dropdown';
import { DynamicDialogModule } from 'primeng-lts/dynamicdialog';
import { InputTextModule } from 'primeng-lts/inputtext';
import { InputTextareaModule } from 'primeng-lts/inputtextarea';
import { MessageModule } from 'primeng-lts/message';
import { MessagesModule } from 'primeng-lts/messages';
import { TableModule } from 'primeng-lts/table';
import { TreeModule } from 'primeng-lts/tree';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StopwatchDirective } from './components/dashboard/stopwatch.directive';
import { ClipboardToastComponent } from './components/dialogs/clipboard-toast.component';
import { ConfirmExitDialogComponent } from './components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from './components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from './components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from './components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from './components/dialogs/master-password-dialog/master-password-dialog.component';
import { EntriesTableComponent } from './components/entries-table/entries-table.component';
import { EntryDetailsComponent } from './components/entry-details/entry-details.component';
import { AutofocusDirective } from './directives/autofocus.directive';
import { BlurEnterDirective } from './directives/blur-enter.directive';
import { DroppableDirective } from './directives/droppable.directive';
import { StickyHeaderDirective } from './directives/sticky-header.directive';
import { TextEmphasizeDirective } from './directives/text-emphasize.directive';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';

@NgModule({
  declarations: [
    MainComponent,
    DashboardComponent,
    EntriesTableComponent,
    StopwatchDirective,
    TextEmphasizeDirective,
    BlurEnterDirective,
    DroppableDirective,
    AutofocusDirective,
    EntryDetailsComponent,
    StickyHeaderDirective,
    ClipboardToastComponent,
    DeleteEntryDialogComponent,
    DeleteGroupDialogComponent,
    EntryDialogComponent,
    ConfirmExitDialogComponent,
    MasterPasswordDialogComponent,
    MasterPasswordComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    MainRoutingModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
    ReactiveFormsModule,
    MessageModule,
    MessagesModule,
    ConfirmDialogModule,
    DynamicDialogModule,
    TableModule,
    DropdownModule,
    TreeModule,
    ContextMenuModule,
    DragDropModule,
  ],
  entryComponents: [
    DeleteEntryDialogComponent,
    DeleteGroupDialogComponent,
    EntryDialogComponent,
    ConfirmExitDialogComponent,
    MasterPasswordDialogComponent,
  ],
  providers: [ TreeDragDropService ],
})
export class MainModule {}
