import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-delete-group-dialog',
  templateUrl: './delete-group-dialog.component.html',
  styleUrls: ['./delete-group-dialog.component.scss']
})
export class DeleteGroupDialogComponent implements OnInit {

  constructor(
    private storageService: StorageService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  removeGroup() {
    this.storageService.removeGroup();
    this.closeConfirmGroupRemoveDialog();
  }

  closeConfirmGroupRemoveDialog() {
    this.ref.close();
  }

}
