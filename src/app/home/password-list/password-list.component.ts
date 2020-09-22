import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-password-list',
  templateUrl: './password-list.component.html',
  styleUrls: ['./password-list.component.scss'],
})
export class PasswordListComponent implements OnInit, OnDestroy {

  get passwordList() {
    return this.passwordStore.passwordList;
  }

  private newEntryAddedListener: (event: Electron.IpcRendererEvent, ...args: any[]) => void = (_, newEntryModel) => {
    this.zone.run(()=>{
      this.passwordStore.addEntry(newEntryModel);
   });
  };

  constructor(
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService,
    private toastService: MessageService,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on('onNewEntryAdded', this.newEntryAddedListener);
  }

  copyToClipboard(data: string) {
    this.electronService.ipcRenderer.send('copyToClipboard', data);
    this.toastService.clear();
    this.passwordStore.clearCounter();
    this.toastService.add({severity:'success', summary:'Copied to clipboard!', life: 15000, detail: '15000' });
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

}