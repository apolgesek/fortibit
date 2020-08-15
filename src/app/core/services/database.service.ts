import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfig } from 'environments/environment';
import { MessageService, TreeNode } from 'primeng/api';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { markDirty } from '../decorators/mark-dirty.decorator';
import { PasswordEntry } from '../models/password-entry.model';
import { DialogsService } from './dialogs.service';
import { ElectronService } from './electron/electron.service';
import { MockDataManager } from './mock-data-manager';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  public readonly entries$: Observable<PasswordEntry[]>;
  public readonly rowIndex: number;

  public dateSaved: Date;
  public selectedPasswords: PasswordEntry[] = [];
  public draggedEntry: PasswordEntry[] = [];
  public selectedCategory: TreeNode;
  public editedEntry: PasswordEntry;
  public contextSelectedCategory: TreeNode;
  public isInvalidPassword = false;
  public isRenameModeOn = false;
  public file: { filePath: string, filename: string };

  public groups: TreeNode[] = [{
    key: uuidv4(),
    label: "Database",
    expanded: true,
    expandedIcon: "pi pi-folder-open",
    draggable: false,
    data: [],
    children: [
      this.buildGroup("General"),
      this.buildGroup("Email"),
      this.buildGroup("Work"),
      this.buildGroup("Banking"),
    ]
  }];

  get confirmEntriesDeleteMessage(): string {
    if (this.selectedPasswords.length > 1) {
      return `Are you sure you want to delete <strong>${ this.selectedPasswords.length }</strong> entries?`;
    } else {
      return `Are you sure you want delete this entry?`;
    }
  }

  get databaseFileName(): string {
    return this.file?.filename ?? '*New db';
  }
  
  public searchPhrase$: Observable<string>;
  private searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private passwordListSource: BehaviorSubject<PasswordEntry[]> = new BehaviorSubject<PasswordEntry[]>([]);

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone,
    private messageService: MessageService,
    private dialogsService: DialogsService
  ) {
    this.entries$ = combineLatest(
      this.passwordListSource,
      this.searchPhraseSource
    ).pipe(
      map(([ passwords, searchPhrase ]) => this.filterEntries(passwords, searchPhrase)),
      shareReplay()
    );

    this.searchPhrase$ = this.searchPhraseSource.asObservable().pipe();

    // introduce invalid password response
    this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
      this.zone.run(() => {
        try {
          const deserializedPasswords = JSON.parse(decrypted);
          this.setGroups(deserializedPasswords);
          this.file = file;
          this.selectedCategory = this.groups[0];
          this.setDateSaved();
          this.router.navigate(['/dashboard']);
        } catch (err) {
          this.isInvalidPassword = true;
        }
      });
    });

    if (AppConfig.mocks) {
      const mockDataManager = new MockDataManager(this);
      mockDataManager.loadMockEntries();
    }

    this.selectedCategory = this.groups[0];
  }

  //#region mark dirty methods
  @markDirty()
  addEntry(entryModel: PasswordEntry) {
    if (entryModel.id) {
      const catalogData = this.findRow(this.groups[0], entryModel.id);
      let entryIdx = catalogData.findIndex(p => p.id === entryModel.id);
      catalogData[entryIdx] = {...entryModel, id: uuidv4()};
      this.selectedPasswords = [catalogData[entryIdx]];
    } else {
      this.selectedCategory.data.push({...entryModel, id: uuidv4()});
      this.resetSearch();
    }
    this.updateEntries();
  }

  @markDirty()
  deleteEntry() {
    if (this.selectedPasswords.length === 0) {
      const catalogData = this.findRow(this.groups[0], this.draggedEntry[0].id);
      const idx = catalogData.findIndex(e => e.id === this.draggedEntry[0].id);
      catalogData.splice(idx, 1);
    } else {
      this.selectedPasswords.forEach(el => {
        const catalogData = this.findRow(this.groups[0], el.id);
        const idx = catalogData.findIndex(e => e.id === el.id);
        catalogData.splice(idx, 1);
      });
    }
    this.selectedPasswords = [];
    this.updateEntries();
  }

  @markDirty()
  setGroups(groups: TreeNode[]) {
    this.groups = groups;
  }

  @markDirty()
  removeGroup() {
    let index = this.selectedCategory.parent.children.findIndex(g => g.key === this.contextSelectedCategory.key);
    this.selectedCategory.parent.children.splice(index, 1);
    this.selectedCategory = this.groups[0];
  }

  @markDirty()
  renameGroup() {
    this.isRenameModeOn = true;
  }

  @markDirty()
  addGroup() {
    this.groups[0].children.push(this.buildGroup("New group"));
  }

  @markDirty()
  addSubgroup() {
    if (!this.selectedCategory.children) {
      this.selectedCategory.children = [];
    }
    this.selectedCategory.children.push(this.buildGroup("New subgroup"));
    this.selectedCategory.expanded = true;
  }

  @markDirty()
  moveUp() {
    const groupData = (this.selectedCategory.data as PasswordEntry[]);
    this.selectedPasswords.sort((a, b) => groupData.findIndex(e => e.id === a.id) <= groupData.findIndex(e => e.id === b.id) ? -1 : 1)

    const isFirst = this.selectedPasswords.find(p => p.id === groupData[0].id);
    if (isFirst) {
      return;
    }
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      [ groupData[elIdx - 1], groupData[elIdx] ] = [ groupData[elIdx], groupData[elIdx - 1] ];
    });
  }

  @markDirty()
  moveDown() {
    const groupData = (this.selectedCategory.data as PasswordEntry[]);
    this.selectedPasswords.sort((a, b) => groupData.findIndex(e => e.id === a.id) >= groupData.findIndex(e => e.id === b.id) ? -1 : 1)

    const isLast = this.selectedPasswords.find(p => p.id === groupData[groupData.length - 1].id);
    if (isLast) {
      return;
    }
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      [ groupData[elIdx], groupData[elIdx + 1] ] = [ groupData[elIdx + 1], groupData[elIdx] ];
    });
  }

  @markDirty()
  moveTop() {
    const groupData = (this.selectedCategory.data as PasswordEntry[]);    
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      groupData.splice(elIdx, 1);
      groupData.unshift(element);
    });
  }

  @markDirty()
  moveBottom() {
    const groupData = (this.selectedCategory.data as PasswordEntry[]);
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      groupData.splice(elIdx, 1);
      groupData.push(element);
    });
  }
  //#endregion

  exitApp() {
    window.onbeforeunload = undefined;
    this.electronService.ipcRenderer.send('exit');
  }

  searchEntries(value: string) {
    this.searchPhraseSource.next(value);
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    if (!property) {
      return;
    }
    entry.lastAccessDate = new Date();
    this.electronService.ipcRenderer.send('copyToClipboard', property);
    this.messageService.clear();
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to clipboard!',
      life: 15000,
      detail: 'clipboard'
    });
  }

  saveDatabase(newPassword: string) {
    this.electronService.ipcRenderer.send('saveFile', { passwordList: this.groups, newPassword });
    this.setDateSaved();
  }

  updateEntries() {
    this.passwordListSource.next(this.selectedCategory.data);
  }

  resetSearch() {
    this.searchPhraseSource.next('');
  }

  moveEntry(targetGroup: string) {
    const copy = [...this.draggedEntry];
    this.deleteEntry();
    const groupData = this.findRowGroup(this.groups[0], targetGroup);
    groupData.push(...copy);
    this.updateEntries();
  }

  trySaveDatabase() {
    !this.file ? this.dialogsService.openMasterPasswordWindow() : this.saveDatabase(null);
  }

  saveNewDatabase(newPassword: string) {
    this.saveDatabase(newPassword);
    this.dialogsService.closeMasterPasswordWindow();
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

  private filterEntries(passwords: PasswordEntry[], phrase: string): PasswordEntry[] {
    if (!phrase) {
      return passwords;
    }
    const tempData: PasswordEntry[] = [];
    this.buildSearchResultList(this.groups[0], tempData, phrase);
    return tempData;
  }

  private buildSearchResultList(node: TreeNode, output: PasswordEntry[] & any, phrase: string) {
    if (node.data.length) {
      const filteredNodes: PasswordEntry[] = node.data
        .filter(p => (p.title.includes(phrase) || p.username.includes(phrase) || p.url?.includes(phrase)));
      if (filteredNodes.length) {
        const path: string[] = [];
        this.buildPath(node, path);
        output.push({ name: path.reverse().join('/'), isGroup: true });
        output.push(...filteredNodes);
      }
    }
    if (node.children?.length) {
      node.children.forEach((element: TreeNode) => {
        this.buildSearchResultList(element, output, phrase);
      });
    } else {
      return output;
    }
  }

  private buildPath(node: TreeNode, path: string[]) {
    path.push(node.label);
    if (node.parent) {
      this.buildPath(node.parent, path);
    }
  }

  private findRow(node: TreeNode, id?: string): PasswordEntry[] {
    if (!id) {
      return node.data;
    }
    if (node.data.find(e => e.id === id)) {
      return node.data;
    } else if (node.children != null) {
      let result;
      for (let i = 0; result == null && i < node.children.length; i++) {
        result = this.findRow(node.children[i], id);
      }
      return result;
    }
  }
  
  private findRowGroup(node: TreeNode, targetGroupKey: string): PasswordEntry[] {
    if (node.key === targetGroupKey) {
      return node.data;
    } else if (node.children != null) {
      let result;
      for (let i = 0; result == null && i < node.children.length; i++) {
        result = this.findRowGroup(node.children[i], targetGroupKey);
      }
      return result;
    }
  }

  private buildGroup(title: string): TreeNode {
    return {
      key: uuidv4(),
      label: title,
      data: [],
      collapsedIcon: "pi pi-folder",
      expandedIcon: "pi pi-folder-open"
    };
  }
}