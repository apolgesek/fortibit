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
import { DialogService } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { TreeModule } from 'primeng/tree';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StopwatchDirective } from './components/dashboard/stopwatch.directive';
import { EntriesTableComponent } from './components/entries-table/entries-table.component';
import { EntryDetailsComponent } from './components/entry-details/entry-details.component';
import { EntryFormComponent } from './components/entry-form/entry-form.component';
import { PopUpsComponent } from './components/pop-ups/pop-ups.component';
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
    EntryFormComponent,
    StopwatchDirective,
    TextEmphasizeDirective,
    BlurEnterDirective,
    DroppableDirective,
    EntryDetailsComponent,
    StickyHeaderDirective,
    PopUpsComponent
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
    TableModule,
    DropdownModule,
    TreeModule,
    ContextMenuModule,
    DragDropModule
  ],
  providers: [ DialogService, TreeDragDropService ],
  entryComponents: [ EntryFormComponent ]
})
export class HomeModule {}
