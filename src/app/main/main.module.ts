import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AboutDialogComponent } from './components/dialogs/about-dialog/about-dialog.component';
import { CheckExposedPasswordsComponent } from './components/dialogs/check-exposed-passwords/check-exposed-passwords.component';
import { ConfirmExitDialogComponent } from './components/dialogs/confirm-exit-dialog/confirm-exit-dialog.component';
import { DeleteEntryDialogComponent } from './components/dialogs/delete-entry-dialog/delete-entry-dialog.component';
import { DeleteGroupDialogComponent } from './components/dialogs/delete-group-dialog/delete-group-dialog.component';
import { EntryDialogComponent } from './components/dialogs/entry-dialog/entry-dialog.component';
import { EntryHistoryComponent } from './components/dialogs/entry-history/entry-history.component';
import { GroupDialogComponent } from './components/dialogs/group-dialog/group-dialog.component';
import { ImportDatabaseMetadataComponent } from './components/dialogs/import-database-metadata/import-database-metadata.component';
import { MasterPasswordDialogComponent } from './components/dialogs/master-password-dialog/master-password-dialog.component';
import { EncryptionTabComponent } from './components/dialogs/settings-dialog/encryption-tab/encryption-tab.component';
import { PasswordChangeTabComponent } from './components/dialogs/settings-dialog/password-change-tab/password-change-tab.component';
import { SettingsDialogComponent } from './components/dialogs/settings-dialog/settings-dialog.component';
import { ViewTabComponent } from './components/dialogs/settings-dialog/view-tab/view-tab.component';
import { EntriesTableComponent } from './components/entries-table/entries-table.component';
import { EntryDetailsSidebarComponent } from './components/entry-details-sidebar/entry-details-sidebar.component';
import { GroupsSidebarComponent } from './components/groups-sidebar/groups-sidebar.component';
import { MasterPasswordSetupComponent } from './components/master-password-setup/master-password-setup.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { MenuBarComponent } from './components/menu-bar/menu-bar.component';
import { SettingsButtonComponent } from './components/settings-button/settings-button.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { AutofocusDirective } from './directives/autofocus.directive';
import { BlurEnterDirective } from './directives/blur-enter.directive';
import { DroppableDirective } from './directives/droppable.directive';
import { EntryIconDirective } from './directives/entry-icon.directive';
import { SortByDirective } from './directives/sort-by.directive';
import { TextEmphasizeDirective } from './directives/text-emphasize.directive';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';

@NgModule({
  declarations: [
    MainComponent,
    WorkspaceComponent,
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
    ImportDatabaseMetadataComponent,
    CheckExposedPasswordsComponent,
    EntryIconDirective,
    EntryHistoryComponent,
    DroppableDirective,
    GroupDialogComponent,
    SettingsDialogComponent,
    EncryptionTabComponent,
    PasswordChangeTabComponent,
    ViewTabComponent,
    MenuBarComponent,
    MasterPasswordSetupComponent,
    SettingsButtonComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    MainRoutingModule,
    ScrollingModule,
  ],
  exports: [
    MenuBarComponent
  ]
})
export class MainModule {}
