import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '@app/core/services/database.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss']
})
export class ConfirmExitDialogComponent implements OnInit {

  constructor(
    private databaseService: DatabaseService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  exitApp() {
    this.databaseService.exitApp();
  }

  closeConfirmExitDialog() {
    this.ref.close();
  }

}
