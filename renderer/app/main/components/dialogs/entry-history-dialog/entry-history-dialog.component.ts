import { CommonModule } from '@angular/common';
import { Component, ComponentRef, DestroyRef, OnInit } from '@angular/core';
import { EntryManager, ModalRef, ModalService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { IHistoryEntry } from '@shared-renderer/history-entry.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface IEntryHistoryDialogDataPayload {
  id: number;
}

@Component({
  selector: 'app-entry-history-dialog',
  templateUrl: './entry-history-dialog.component.html',
  styleUrls: ['./entry-history-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent
  ]
})
export class EntryHistoryDialogComponent implements IModal, OnInit {
  public readonly ref: ComponentRef<EntryHistoryDialogComponent>;
  public readonly additionalData?: IAdditionalData<IEntryHistoryDialogDataPayload>;
  public history: IHistoryEntry[];

  constructor(
    private readonly destroyRef: DestroyRef,
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

  async openEntry(entry: IHistoryEntry) {
    const modalRef = await this.modalService.openHistoryEntryWindow(entry, { readonly: true });

    modalRef.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.getEntryHistory();
    });
  }

  private async getEntryHistory(): Promise<void> {
    this.history = [...this.entryManager.entryHistory];
  }
}
