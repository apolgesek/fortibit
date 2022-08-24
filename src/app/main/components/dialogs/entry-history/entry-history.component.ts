import { Component, ComponentRef, OnInit } from '@angular/core';
import { ModalRef, ModalService, StorageService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { IHistoryEntry } from '@shared-renderer/history-entry.model';
import { IPasswordEntry } from '@shared-renderer/password-entry.model';

@Component({
  selector: 'app-entry-history',
  templateUrl: './entry-history.component.html',
  styleUrls: ['./entry-history.component.scss']
})
export class EntryHistoryComponent implements IModal, OnInit {
  public readonly ref: ComponentRef<EntryHistoryComponent>;
  public readonly additionalData?: IAdditionalData;
  public history: IHistoryEntry[]; 

  constructor(
    private readonly storageService: StorageService,
    private readonly modalService: ModalService,
    private readonly modalRef: ModalRef
  ) {}
  
  close() {
    this.modalRef.close();
  }

  ngOnInit(): void {
    this.history = this.storageService.entryHistory;
  }

  openEntry(entry: IPasswordEntry) {
    this.modalService.openHistoryEntryWindow(entry, { readonly: true });
  }
}
