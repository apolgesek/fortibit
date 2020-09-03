import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-delete-entry-dialog',
  templateUrl: './delete-entry-dialog.component.html',
  styleUrls: ['./delete-entry-dialog.component.scss']
})
export class DeleteEntryDialogComponent implements OnInit {

  get selectedRowsCount(): number {
    return this.databaseService.selectedPasswords.length;
  }

  constructor(
    private databaseService: DatabaseService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  deleteEntry() {
    this.databaseService.deleteEntry();
    this.closeRemoveEntryDialog();
  }

  closeRemoveEntryDialog() {
    this.ref.close();
  }

}
