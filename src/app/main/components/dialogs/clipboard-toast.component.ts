import { Component } from '@angular/core';
import { MessageService } from 'primeng-lts/api';

@Component({
  selector: 'app-clipboard-toast',
  templateUrl: './clipboard-toast.component.html',
  styleUrls: ['./clipboard-toast.component.scss'],
})
export class ClipboardToastComponent {
  constructor(private messageService: MessageService) {}

  clearToast() {
    this.messageService.clear();
  }
}
