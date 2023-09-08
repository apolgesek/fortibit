import { AfterViewInit, Component, DestroyRef, inject } from '@angular/core';
import { EntriesTableComponent } from '../entries-list/entries-list.component';
import { EntryDetailsSidebarComponent } from '../entry-details-sidebar/entry-details-sidebar.component';
import { GroupsSidebarComponent } from '../groups-sidebar/groups-sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, tap } from 'rxjs';
import { HotkeyHandler } from 'injection-tokens';

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
  private readonly hotkeyHandler = inject(HotkeyHandler);
  private readonly destroyRef = inject(DestroyRef);

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
