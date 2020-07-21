import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PasswordEntry } from '@app/core/models/password-entry.model';
import { ElectronService } from '@app/core/services';
import { HotkeyService } from '@app/core/services/hotkey/hotkey.service';
import { PasswordStoreService } from '@app/core/services/password-store.service';
import { MenuItem, MessageService, TreeNode } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-entries-table',
  templateUrl: './entries-table.component.html',
  styleUrls: ['./entries-table.component.scss']
})
export class EntriesTableComponent implements OnInit, OnDestroy {
  public passwordList$: Observable<PasswordEntry[]>;
  public searchPhrase$: Observable<string>;

  public groupContextMenuItems: MenuItem[];
  public databaseItems: MenuItem[];
  public entryMenuItems: MenuItem[];
  public multiEntryMenuItems: MenuItem[];

  @ViewChild('groupContextMenu') groupContextMenu: ContextMenu;

  get selectedEntries(): any[] {
    return this.passwordStore.selectedPasswords;
  }

  get selectedCategory(): TreeNode {
    return this.passwordStore.selectedCategory;
  }

  get filePath(): string {
    return this.passwordStore.file?.filename ?? '*New db';
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
    private zone: NgZone,
    private electronService: ElectronService,
    private passwordStore: PasswordStoreService,
    private toastService: MessageService,
    private hotkeyService: HotkeyService
  ) { 
    this.passwordList$ = this.passwordStore.filteredList$;
    this.searchPhrase$ = this.passwordStore.searchPhrase$;
  }

  ngOnInit(): void {
    this.electronService.ipcRenderer.on('onNewEntryAdded', this.newEntryAddedListener);
    this.passwordStore.notifyStream();

    this.groupContextMenuItems = [
      {
        label: 'Add subgroup',
        icon: 'pi pi-fw pi-plus',
        command: () => this.passwordStore.addSubgroup(),
      },
      {
        separator: true,
      },
      {
        label: 'Rename',
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.passwordStore.renameGroup();
          requestAnimationFrame(() => {
            (<HTMLInputElement>document.querySelector('.group-name-input')).focus();
          });
        }
      },
      {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => this.passwordStore.openDeleteGroupWindow(),
      },
    ] as MenuItem[];

    const rearrangeItems = {
      label: 'Rearrange',
      items: [
        {
          label: 'Move top (Ctrl + ↑)',
          icon: 'pi pi-fw pi-angle-double-up',
          command: () => this.passwordStore.moveTop()
        },
        {
          label: 'Move up (Alt + ↑)',
          icon: 'pi pi-fw pi-angle-up',
          command: () => this.passwordStore.moveUp()
        },
        {
          label: 'Move down (Alt + ↓)',
          icon: 'pi pi-fw pi-angle-down',
          command: () => this.passwordStore.moveDown()
        },
        {
          label: 'Move bottom (Ctrl + ↓)',
          icon: 'pi pi-fw pi-angle-double-down',
          command: () => this.passwordStore.moveBottom()
        }
      ] as MenuItem[]
    } as MenuItem;

    const deleteItem = {
      label: this.hotkeyService.deleteShortcutLabel,
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.passwordStore.openDeleteEntryWindow();
      }
    } as MenuItem;

    this.multiEntryMenuItems = [rearrangeItems, deleteItem];
    this.entryMenuItems = [
      rearrangeItems,
      {
        label: 'Copy username',
        command: () => {
          this.copyToClipboard(
            this.passwordStore.selectedPasswords[0],
            this.passwordStore.selectedPasswords[0].username
          );
        }
      },
      {
        label: 'Copy password',
        command: () => {
          this.copyToClipboard(
            this.passwordStore.selectedPasswords[0],
            this.passwordStore.selectedPasswords[0].username
          );
        }
      },
      { separator: true },
      {
        label: 'Edit (Enter)',
        visible: this.passwordStore.selectedPasswords.length === 0,
        icon: 'pi pi-fw pi-pencil',
        command: () => {
          this.passwordStore.openEditEntryWindow();
        }
      },
      deleteItem
    ] as MenuItem[];
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
    if (this.hotkeyService.getMultiselectionKey(event) && event.type === 'click') {
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

  selectRowContext(password: PasswordEntry) {
    if (this.passwordStore.selectedPasswords.length === 0) {
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
    this.passwordStore.selectedCategory = event.node;
    this.passwordStore.notifyStream();
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
    if (this.selectedEntries.length > 0) {
      this.passwordStore.draggedEntry = this.selectedEntries;
    } else {
      this.passwordStore.draggedEntry = [rowData];
    }

    let elem = null;
    if (process.platform === 'darwin') {
      elem = document.createElement("div");
      elem.id = "drag-ghost";
      elem.style.position = "absolute";
      elem.style.top = "-1000px";
      document.body.appendChild(elem);
    } else {
      elem = new Image();
      elem.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    }
    event.dataTransfer.setDragImage(elem, 0, 0);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'none');
  }

  handleDragEnd() {
    if (process.platform === 'darwin') {
      let ghost = document.getElementById("drag-ghost");
      ghost.parentNode.removeChild(ghost);
    }

    document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
    this.passwordStore.draggedEntry = [];
  }

  ngOnDestroy(): void {
    this.electronService.ipcRenderer.off('onNewEntryAdded', this.newEntryAddedListener);
  }

}