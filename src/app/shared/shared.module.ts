import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { MasterPasswordSetupComponent } from './components/master-password-setup/master-password-setup.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ContextMenuItemDirective } from './directives/context-menu-item.directive';
import { DropdownMenuDirective } from './directives/dropdown-menu.directive';
import { DropdownToggleDirective } from './directives/dropdown-toggle.directive';
import { DropdownDirective } from './directives/dropdown.directive';
import { MenuItemDirective } from './directives/menu-item.directive';
import { MenuDirective } from './directives/menu.directive';
import { SidebarHandleDirective } from './directives/sidebar-handle.directive';
import { ModalComponent } from './index';
import { TabsetComponent } from './components/tabset/tabset.component';
import { TabComponent } from './components/tab/tab.component';
import { FocusableListDirective } from './directives/focusable-list.directive';
import { FocusableListItemDirective } from './directives/focusable-list-item.directive';
import { DateMaskDirective } from './directives/date-mask.directive';

@NgModule({
  declarations: [
    DropdownToggleDirective,
    ModalComponent,
    ContextMenuComponent,
    ContextMenuItemDirective,
    NotificationComponent,
    SidebarHandleDirective,
    DropdownDirective,
    DropdownMenuDirective,
    MenuItemDirective,
    MasterPasswordSetupComponent,
    MenuDirective,
    TabsetComponent,
    TabComponent,
    FocusableListDirective,
    FocusableListItemDirective,
    DateMaskDirective,
  ],
  imports: [BrowserAnimationsModule, CommonModule, ReactiveFormsModule],
  exports: [
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    ModalComponent,
    ContextMenuComponent,
    ContextMenuItemDirective,
    SidebarHandleDirective,
    DropdownDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    MenuItemDirective,
    MenuDirective,
    MasterPasswordSetupComponent,
    TabsetComponent,
    TabComponent,
    FocusableListDirective,
    FocusableListItemDirective,
    DateMaskDirective
  ],
})
export class SharedModule {}
