import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogRef } from 'primeng-lts/dynamicdialog';

@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss']
})
export class DeleteEntryDialogComponent {
  get selectedRowsCount(): number {
    return this.storageService.selectedPasswords.length;
  }

  constructor(
    private ref: DynamicDialogRef,
    private storageService: StorageService
  ) { }

  deleteEntry() {
    this.storageService.deleteEntry();
    this.close();
  }

  close() {
    this.ref.close();
  }
}
