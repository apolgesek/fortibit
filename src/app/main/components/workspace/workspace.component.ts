import { AfterViewInit, Component, Inject, OnDestroy } from '@angular/core';
import { HotkeyHandler } from '@app/app.module';
import { IHotkeyHandler } from '@app/core/models';
import { fromEvent, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
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
