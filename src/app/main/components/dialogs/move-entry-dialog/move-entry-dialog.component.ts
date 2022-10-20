import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, ComponentRef, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IPasswordGroup } from '@app/core/models';
import { EntryManager, GroupManager, ModalRef, NotificationService } from '@app/core/services';
import { AutofocusDirective } from '@app/main/directives/autofocus.directive';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, fromEvent, map, Observable, of, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-move-entry-dialog',
  templateUrl: './move-entry-dialog.component.html',
  styleUrls: ['./move-entry-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    AutofocusDirective,
    ScrollingModule
  ]
})
export class MoveEntryDialogComponent implements IModal, OnInit, OnDestroy {
  public readonly ref: ComponentRef<unknown>;
  public readonly additionalData?: IAdditionalData;

  public groups$: Observable<IPasswordGroup[]>;
  @ViewChild('searchPhrase') public searchText: ElementRef;

  private readonly searchPhrase: BehaviorSubject<string> = new BehaviorSubject('');
  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly modalRef: ModalRef,
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly notificationService: NotificationService
  ) { }

  close() {
    this.modalRef.close();
  }

  trackingTag(_: number, item: IPasswordGroup): number {
    return item.id;
  }

  async ngOnInit(): Promise<void> {
    this.groups$ = combineLatest([
      of([...this.groupManager.groups.filter(x => x.id !== this.groupManager.selectedGroup)]),
      this.searchPhrase.pipe(map(x => x.toLowerCase()))
    ]).pipe(
      map(([groups, searchText]) => {
        if (searchText.length) {
          return groups.filter(x => x.name.toLowerCase().includes(searchText));
        }

        return groups;
      }),
      takeUntil(this.destroyed)
    );
  }

  ngAfterViewInit(): void {
    fromEvent(this.searchText.nativeElement, 'input')
      .pipe(distinctUntilChanged(), debounceTime(500), takeUntil(this.destroyed))
      .subscribe(() => {
        const inputElement = this.searchText.nativeElement as HTMLInputElement;
        this.searchPhrase.next(inputElement.value);
      });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  async moveTo(group: IPasswordGroup): Promise<void> {
    this.entryManager.movedEntries = [...this.entryManager.selectedPasswords.map(x => x.id)];
    const movedEntriesCount = this.entryManager.movedEntries.length;
    await this.entryManager.moveEntry(group.id);

    this.notificationService.add({
      message: `${movedEntriesCount > 1 ? 'Entries' : 'Entry'} moved`,
      type: 'success',
      alive: 5000
    });
    this.close();
  }
}
