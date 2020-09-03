import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TreeDragDropService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DragDropModule } from 'primeng/dragdrop';
import { DropdownModule } from 'primeng/dropdown';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { TreeModule } from 'primeng/tree';
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
import { BlurEnterDirective } from './directives/blur-enter.directive';
import { DroppableDirective } from './directives/droppable.directive';
import { StickyHeaderDirective } from './directives/sticky-header.directive';
import { TextEmphasizeDirective } from './directives/text-emphasize.directive';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';

@NgModule({
  declarations: [
    MainComponent,
    DashboardComponent,
    EntriesTableComponent,
    StopwatchDirective,
    TextEmphasizeDirective,
    BlurEnterDirective,
    DroppableDirective,
    EntryDetailsComponent,
    StickyHeaderDirective,
    ClipboardToastComponent,
    DeleteEntryDialogComponent,
    DeleteGroupDialogComponent,
    EntryDialogComponent,
    ConfirmExitDialogComponent,
    MasterPasswordDialogComponent
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
    DragDropModule
  ],
  providers: [ DialogService, TreeDragDropService ],
})
export class HomeModule {}
