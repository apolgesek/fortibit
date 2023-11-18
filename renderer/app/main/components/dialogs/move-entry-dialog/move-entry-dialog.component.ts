import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ComponentRef, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntryManager, GroupManager, ModalRef, NotificationService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { IEntryGroup } from '@shared-renderer/entry-group';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, fromEvent, map, Observable, of } from 'rxjs';

@Component({
  selector: 'app-move-entry-dialog',
  templateUrl: './move-entry-dialog.component.html',
  styleUrls: ['./move-entry-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ScrollingModule
  ]
})
export class MoveEntryDialogComponent implements IModal, OnInit, AfterViewInit {
  @ViewChild('searchPhrase') public searchText: ElementRef;
  public readonly ref: ComponentRef<unknown>;
  public readonly additionalData?: IAdditionalData;
  public groups$: Observable<IEntryGroup[]>;

  private readonly searchPhrase: BehaviorSubject<string> = new BehaviorSubject('');

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly modalRef: ModalRef,
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly notificationService: NotificationService
  ) { }

  get selectedPasswordsLength(): number {
    return this.entryManager.selectedPasswords.length;
  }

  close() {
    this.modalRef.close();
  }

  trackingTag(_: number, item: IEntryGroup): number {
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
      takeUntilDestroyed(this.destroyRef)
    );
  }

  ngAfterViewInit(): void {
    fromEvent(this.searchText.nativeElement, 'input')
      .pipe(distinctUntilChanged(), debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const inputElement = this.searchText.nativeElement as HTMLInputElement;
        this.searchPhrase.next(inputElement.value);
      });
  }

  async moveTo(group: IEntryGroup): Promise<void> {
    this.entryManager.movedEntries = [...this.entryManager.selectedPasswords.map(x => x.id)];
    const movedEntriesCount = this.entryManager.movedEntries.length;
    await this.entryManager.moveEntry(group.id);

    this.notificationService.add({
      message: `${movedEntriesCount > 1 ? 'Entries' : 'Entry'} moved`,
      type: 'success',
      alive: 10 * 1000
    });
    this.close();
  }
}
