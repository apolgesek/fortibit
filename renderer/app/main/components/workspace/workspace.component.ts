import { Component } from '@angular/core';
import { EntriesTableComponent } from '../entries-list/entries-list.component';
import { EntryDetailsSidebarComponent } from '../entry-details-sidebar/entry-details-sidebar.component';
import { GroupsSidebarComponent } from '../groups-sidebar/groups-sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
  standalone: true,
  imports: [
    ToolbarComponent,
    GroupsSidebarComponent,
    EntriesTableComponent,
    EntryDetailsSidebarComponent
  ]
})
export class WorkspaceComponent {}
