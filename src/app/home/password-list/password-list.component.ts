import { Component, OnInit, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { ElectronService } from '../../core/services';
import { PasswordStoreService } from '../../core/services/password-store.service';
import { MessageService, TreeNode } from 'primeng/api';
import { Observable } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ContextMenu } from 'primeng/contextmenu';

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

  @ViewChild('cm') groupContextMenu: ContextMenu;

  get selectedRow(): any[] {
    return this.passwordStore.selectedPasswords;
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

  get selectedGroupLabel(): string {
    return this.contextSelectedCategory?.label;
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
        command: () => this.passwordStore.openDeleteGroupWindow(),
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

  trackByFn(_: number, entry: PasswordEntry): string {
    return entry.id;
  }

  copyToClipboard(row: PasswordEntry, prop: string) {
    if (!prop) {
      return;
    }
    this.electronService.ipcRenderer.send('copyToClipboard', prop);
    row.lastAccessDate = new Date();
    this.toastService.clear();
    this.toastService.add({ severity: 'success', summary: 'Copied to clipboard!', life: 15000, detail: 'clipboard' });
  }

  filterCategory(event: {node: TreeNode}) {
    this.passwordStore.selectedCategory.data = event.node.data || [];
    this.passwordStore.selectedPasswords = [];
    this.passwordStore.resetSearch();
    this.passwordStore.notifyStream();
  }

  collapseCategory(event: any) {
    if (event.node.label === 'Database') {
      event.node.expanded = true;
    }
  }

  selectRow(event: MouseEvent, password: PasswordEntry) {
    if (event.metaKey && event.type === 'click') {
      const foundIndex = this.passwordStore.selectedPasswords.findIndex(p => p.id === password.id);
      if (foundIndex > -1) {
        this.passwordStore.selectedPasswords.splice(foundIndex, 1);
        return;
      }
      this.passwordStore.selectedPasswords.push(password);
    } else {
      this.passwordStore.selectedPasswords = [password];
    }
  }

  isRowSelected(rowData: PasswordEntry): boolean {
    return this.passwordStore.selectedPasswords.filter(e => e.id === rowData.id).length > 0;
  }

  isRowDragged(rowData: PasswordEntry): boolean {
    return this.passwordStore.draggedEntry.filter(e => e.id === rowData.id).length > 0;
  }

  setContextMenuCategory(event: any) {
    if (event.node.label === 'Database') {
      this.groupContextMenu.hide();
      return;
    }
    this.passwordStore.contextSelectedCategory = event.node;
  }

  addGroup() {
    this.passwordStore.addGroup();
  }

  setRenameModeOff() {
    requestAnimationFrame(() => {
      this.passwordStore.isRenameModeOn = false;
    });
  }

  handleDragStart(event: DragEvent, rowData: PasswordEntry) {
    if (this.selectedRow.length > 0) {
      this.passwordStore.draggedEntry = this.selectedRow;
    } else {
      this.passwordStore.draggedEntry = [rowData];
    }

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
    this.passwordStore.draggedEntry = [];
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

}