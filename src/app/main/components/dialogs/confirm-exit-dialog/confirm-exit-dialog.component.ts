import { Component, OnInit } from '@angular/core';
import { CoreService } from '@app/core/services/core.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirm-exit-dialog',
  templateUrl: './confirm-exit-dialog.component.html',
  styleUrls: ['./confirm-exit-dialog.component.scss']
})
export class ConfirmExitDialogComponent implements OnInit {

  constructor(
    private coreService: CoreService,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit(): void {
  }

  exitApp() {
    this.coreService.exitApp();
  }

  closeConfirmExitDialog() {
    this.ref.close();
  }

}
