import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-password-list',
  templateUrl: './password-list.component.html',
  styleUrls: ['./password-list.component.scss'],
})
export class PasswordListComponent implements OnInit, OnDestroy {

  public passwordList$: Observable<any[]>;

  get selectedRow() {
    return this.passwordStore.selectedPassword;
  }

  private _selectedRow: any;
  private newEntryAddedListener: (event: Electron.IpcRendererEvent, ...args: any[]) => void = (_, newEntryModel) => {
    this.zone.run(() => {
      this.passwordStore.addEntry(newEntryModel);
   });
  };

  constructor(
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService,
    private toastService: MessageService,
    private zone: NgZone,
  ) { 
    this.passwordList$ = this.passwordStore.filteredList$;
  }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on('onNewEntryAdded', this.newEntryAddedListener);
  }

  ngAfterViewInit(): void {
    this.passwordStore.notifyStream();
  }

  copyToClipboard(data: string) {
    this.electronService.ipcRenderer.send('copyToClipboard', data);
    this.toastService.clear();
    this.toastService.add({ severity:'success', summary:'Copied to clipboard!', life: 15000, detail: 'clipboard' });
  }

  selectRow(password: any, rowIndex: number) {
    this._selectedRow = password;
    this.passwordStore.selectedPassword = password;
    this.passwordStore.rowIndex = rowIndex;
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

}