import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ConfirmExitDialogComponent } from './components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from './components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from './components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from './components/dialogs/entry-dialog/entry-dialog.component';
import { MasterPasswordDialogComponent } from './components/dialogs/master-password-dialog/master-password-dialog.component';
import { EntriesTableComponent } from './components/entries-table/entries-table.component';
import { EntryDetailsSidebarComponent } from './components/entry-details-sidebar/entry-details-sidebar.component';
import { AutofocusDirective } from './directives/autofocus.directive';
import { BlurEnterDirective } from './directives/blur-enter.directive';
import { SortByDirective } from './directives/sort-by.directive';
import { TextEmphasizeDirective } from './directives/text-emphasize.directive';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TreeModule } from '@circlon/angular-tree-component';
import { GroupsSidebarComponent } from './components/groups-sidebar/groups-sidebar.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { AboutDialogComponent } from './components/dialogs/about-dialog/about-dialog.component';
import { SettingsDialogComponent } from './components/dialogs/settings-dialog/settings-dialog.component';
import { ImportDatabaseMetadataComponent } from './components/dialogs/import-database-metadata/import-database-metadata.component';
@NgModule({
  declarations: [
    MainComponent,
    DashboardComponent,
    EntriesTableComponent,
    TextEmphasizeDirective,
    BlurEnterDirective,
    SortByDirective,
    AutofocusDirective,
    EntryDetailsSidebarComponent,
    DeleteEntryDialogComponent,
    DeleteGroupDialogComponent,
    EntryDialogComponent,
    ConfirmExitDialogComponent,
    MasterPasswordDialogComponent,
    MasterPasswordComponent,
    GroupsSidebarComponent,
    ToolbarComponent,
    AboutDialogComponent,
    SettingsDialogComponent,
    ImportDatabaseMetadataComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    MainRoutingModule,
    ScrollingModule,
    TreeModule
  ],
  entryComponents: [
    DeleteEntryDialogComponent,
    DeleteGroupDialogComponent,
    EntryDialogComponent,
    ConfirmExitDialogComponent,
    MasterPasswordDialogComponent,
  ],
})
export class MainModule {}
