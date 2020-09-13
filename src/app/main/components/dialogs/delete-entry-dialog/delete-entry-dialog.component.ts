import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss']
})
export class DeleteEntryDialogComponent implements OnInit {

  get selectedRowsCount(): number {
    return this.storageService.selectedPasswords.length;
  }

  constructor(
    private storageService: StorageService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  deleteEntry() {
    this.storageService.deleteEntry();
    this.closeRemoveEntryDialog();
  }

  closeRemoveEntryDialog() {
    this.ref.close();
  }

}
