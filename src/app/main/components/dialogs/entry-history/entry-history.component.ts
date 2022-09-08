import { Component, ComponentRef, OnDestroy, OnInit } from '@angular/core';
import { EntryManager, ModalRef, ModalService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { IHistoryEntry } from '@shared-renderer/history-entry.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-entry-history',
  templateUrl: './entry-history.component.html',
  styleUrls: ['./entry-history.component.scss']
})
export class EntryHistoryComponent implements IModal, OnInit, OnDestroy {
  public readonly ref: ComponentRef<EntryHistoryComponent>;
  public readonly additionalData?: IAdditionalData;
  public history: IHistoryEntry[]; 

  private readonly destroyed: Subject<void> = new Subject();

  constructor(
    private readonly entryManager: EntryManager,
    private readonly modalService: ModalService,
    private readonly modalRef: ModalRef
  ) {}
  
  close() {
    this.modalRef.close();
  }

  ngOnInit(): void {
    this.history = this.entryManager.entryHistory;
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  async openEntry(entry: IHistoryEntry) {
    const modalRef = await this.modalService.openHistoryEntryWindow(entry, { readonly: true });
    
    modalRef.onClose.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.getEntryHistory();
    });
  }

  private async getEntryHistory(): Promise<void> {
    this.history = [...this.entryManager.entryHistory];
  }
}