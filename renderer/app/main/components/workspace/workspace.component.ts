import { AfterViewInit, Component, DestroyRef, Inject } from '@angular/core';
import { IHotkeyHandler } from '@app/core/models';
import { HotkeyHandler } from 'injection-tokens';
import { fromEvent, tap } from 'rxjs';
import { EntriesTableComponent } from '../entries-table/entries-table.component';
import { EntryDetailsSidebarComponent } from '../entry-details-sidebar/entry-details-sidebar.component';
import { GroupsSidebarComponent } from '../groups-sidebar/groups-sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
export class WorkspaceComponent implements AfterViewInit {
  constructor(
    @Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler,
    private readonly destroyRef: DestroyRef
  ) {}

  ngAfterViewInit(): void {
    fromEvent(window, 'keydown')
      .pipe(
        tap((event: Event) => {
          this.hotkeyHandler.intercept(event as KeyboardEvent);
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
  }
}
