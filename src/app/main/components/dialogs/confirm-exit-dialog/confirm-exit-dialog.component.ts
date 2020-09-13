import { Component, OnInit } from '@angular/core';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss']
})
export class ConfirmExitDialogComponent implements OnInit {

  constructor(
    private storageService: StorageService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  exitApp() {
    this.storageService.exitApp();
  }

  closeConfirmExitDialog() {
    this.ref.close();
  }

}
