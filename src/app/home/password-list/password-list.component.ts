import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { MessageService, TreeNode } from 'primeng/api';
import { Observable } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { PasswordEntry } from '@app/core/models/password-entry.model';

@Component({
  selector: 'app-password-list',
  templateUrl: './password-list.component.html',
  styleUrls: ['./password-list.component.scss'],
})
export class PasswordListComponent implements OnInit, OnDestroy {
  public passwordList$: Observable<PasswordEntry[]>;
  public searchPhrase$: Observable<string>;
  public contextMenuItems: MenuItem[];
  public databaseItems: MenuItem[];

  get selectedRow(): PasswordEntry {
    return this.passwordStore.selectedPassword;
  }

  get selectedCategory(): TreeNode {
    return this.passwordStore.selectedCategory;
  }

  set selectedCategory(value: TreeNode) {
    this.passwordStore.selectedCategory = value;
  }

  get files(): any {
    return this.passwordStore.files;
  }

  get contextSelectedCategory(): TreeNode{
    return this.passwordStore.contextSelectedCategory;
  }

  get isRenameModeOn(): boolean {
    return this.passwordStore.isRenameModeOn;
  }

  get draggedEntry(): PasswordEntry {
    return this.passwordStore.draggedEntry;
  }

  private newEntryAddedListener: (event: Electron.IpcRendererEvent, ...args: PasswordEntry[]) => void = (_, newEntryModel) => {
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
    this.searchPhrase$ = this.passwordStore.searchPhrase$;
  }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on('onNewEntryAdded', this.newEntryAddedListener);
    this.passwordStore.notifyStream();

    this.contextMenuItems = [
      {
        label: 'Delete',
        icon: 'pi pi-fw pi-times',
        command: () => this.passwordStore.removeGroup(),
      } as MenuItem,
      {
        label: 'Rename',
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.passwordStore.renameGroup();
          requestAnimationFrame(() => {
            (<HTMLInputElement>document.querySelector('.group-name-input')).focus();
          });
        }
      } as MenuItem
    ];
  }

  trackByFn(index: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(data: string) {
    if (!data) {
      return;
    }
    this.electronService.ipcRenderer.send('copyToClipboard', data);
    this.toastService.clear();
    this.toastService.add({ severity: 'success', summary: 'Copied to clipboard!', life: 15000, detail: 'clipboard' });
  }

  filterCategory(event: {node: TreeNode}) {
    this.passwordStore.selectedCategory.data = event.node.data || [];
    this.passwordStore.selectedPassword = undefined;
    this.passwordStore.resetSearch();
    this.passwordStore.notifyStream();
  }

  collapseCategory(event: any) {
    if (event.node.label === 'Database') {
      event.node.expanded = true;
    }
  }

  selectRow(password: PasswordEntry, rowIndex: number) {
    this.passwordStore.selectedPassword = password;
    this.passwordStore.rowIndex = rowIndex;
  }

  setContextMenuCategory(event: any) {
    this.passwordStore.contextSelectedCategory = event.node;
  }

  addGroup() {
    this.passwordStore.addGroup();
  }

  setRenameModeOff() {
    this.passwordStore.isRenameModeOn = false;
  }

  handleDragStart(event: DragEvent, rowData: PasswordEntry) {
    this.passwordStore.draggedEntry = rowData;
    var elem = document.createElement("div");
    elem.id = "drag-ghost";
    elem.style.position = "absolute";
    elem.style.top = "-1000px";
    document.body.appendChild(elem);
    event.dataTransfer.setDragImage(elem, 0, 0);
    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'none');
  }

  handleDragEnd(event: DragEvent) {
    var ghost = document.getElementById("drag-ghost");
    if (ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
    this.passwordStore.draggedEntry = undefined;
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

}