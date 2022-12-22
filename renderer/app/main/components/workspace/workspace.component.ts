import { AfterViewInit, Component, Inject, OnDestroy } from '@angular/core';
import { IHotkeyHandler } from '@app/core/models';
import { HotkeyHandler } from 'injection-tokens';
import { fromEvent, Subject, takeUntil, tap } from 'rxjs';
import { EntriesTableComponent } from '../entries-table/entries-table.component';
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
export class WorkspaceComponent implements AfterViewInit, OnDestroy {
  private readonly destroyed: Subject<void> = new Subject();
  constructor(@Inject(HotkeyHandler) private readonly hotkeyHandler: IHotkeyHandler) {}

  ngAfterViewInit(): void {
    fromEvent(window, 'keydown')
    .pipe(
      tap((event: Event) => {
        this.hotkeyHandler.intercept(event as KeyboardEvent);
      }),
      takeUntil(this.destroyed)
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }
}
