import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-delete-group-dialog',
  templateUrl: './delete-group-dialog.component.html',
  styleUrls: ['./delete-group-dialog.component.scss']
})
export class DeleteGroupDialogComponent implements OnInit {

  constructor(
    private databaseService: DatabaseService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  removeGroup() {
    this.databaseService.removeGroup();
    this.closeConfirmGroupRemoveDialog();
  }

  closeConfirmGroupRemoveDialog() {
    this.ref.close();
  }

}
