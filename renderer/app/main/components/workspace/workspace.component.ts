import { Component } from '@angular/core';
import { EntriesTableComponent } from '../entries-list/entries-list.component';
import { DetailsSidebarComponent } from '../details-sidebar/details-sidebar.component';
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
		DetailsSidebarComponent,
	],
})
export class WorkspaceComponent {}
