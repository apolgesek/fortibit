import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { EntryFormComponent } from '@app/main/components/entry-form/entry-form.component';
import { AppConfig } from 'environments/environment';
import { MessageService, TreeNode } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { markDirty } from '../decorators/mark-dirty.decorator';
import { PasswordEntry } from '../models/password-entry.model';
import { ElectronService } from './electron/electron.service';

@Injectable({
  providedIn: 'root'
})
export class PasswordStoreService {

  public entries$: Observable<PasswordEntry[]>;
  public dateSaved: Date;
  public selectedPasswords: PasswordEntry[] = [];
  public draggedEntry: PasswordEntry[] = [];
  public selectedCategory: TreeNode;
  public contextSelectedCategory: TreeNode;
  public rowIndex: number;
  public isInvalidPassword = false;
  public file: { filePath: string, filename: string };
  public isRenameModeOn: boolean;
  public isDialogOpened: boolean;
  public dialogRef: DynamicDialogRef;
  public isNewPasswordDialogShown = false;
  public isRemoveEntryDialogShown = false;
  public isConfirmExitDialogShown = false;
  public isConfirmGroupRemoveDialogShown = false;

  public groups: TreeNode[] = [{
    key: uuidv4(),
    label: "Database",
    data: [],
    expanded: true,
    expandedIcon: "pi pi-folder-open",
    draggable: false,
    children: [
      this.buildGroup("General"),
      this.buildGroup("Email"),
      this.buildGroup("Work"),
      this.buildGroup("Banking"),
    ]
  }];

  get confirmEntriesDeleteMessage(): string {
    if (this.selectedPasswords.length > 1) {
      return `Are you sure you want to delete <strong>${this.selectedPasswords.length}</strong> entries?`;
    } else {
      return `Are you sure you want delete this entry?`;
    }
  }

  get databaseFileName(): string {
    return this.file?.filename ?? '*New db';
  }
  
  public searchPhrase$: Observable<string>;
  private _searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private _passwordListSource: BehaviorSubject<PasswordEntry[]> = new BehaviorSubject<PasswordEntry[]>([]);

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone,
    private dialogService: DialogService,
    private messageService: MessageService
  ) {
    this.entries$ = combineLatest(
      this._passwordListSource,
      this._searchPhraseSource
    ).pipe(
      map(([ passwords, searchPhrase ]) => this.filterEntries(passwords, searchPhrase)),
      shareReplay()
    );

    this.searchPhrase$ = this._searchPhraseSource.asObservable().pipe();

    this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
      this.zone.run(() => {
        try {
          const deserializedPasswords = JSON.parse(decrypted);
          this.isInvalidPassword = false;
          this.file = file;
          this.clearAll();
          this.groups = deserializedPasswords;
          this.selectedCategory = this.groups[0];
          this.setDateSaved();
          this.router.navigate(['/dashboard']);
        } catch (err) {
          this.isInvalidPassword = true;
          return;
        }
      });
    });

    if (AppConfig.mocks) {
      this.loadTestData();
    }

    this.selectedCategory = this.groups[0];
  }

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

  searchEntries(value: string) {
    this._searchPhraseSource.next(value);
  }

  @markDirty()
  clearAll() {
    this.groups = [];
  }

  saveDatabase(newPassword: string) {
    this.electronService.ipcRenderer.send('saveFile', {passwordList: this.groups, newPassword});
    this.setDateSaved();
  }

  updateEntries() {
    this._passwordListSource.next(this.selectedCategory.data);
  }

  resetSearch() {
    this._searchPhraseSource.next('');
  }

  @markDirty()
  removeGroup() {
    let idx = this.selectedCategory.parent.children.findIndex(g => g.key === this.contextSelectedCategory.key);
    this.selectedCategory.parent.children.splice(idx, 1);
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

  moveEntry(targetGroup: string) {
    const copy = [...this.draggedEntry];
    this.deleteEntry();
    const groupData = this.findRowGroup(this.groups[0], targetGroup);
    groupData.push(...copy);
    this.updateEntries();
  }

  trySaveDatabase() {
    if (!this.file) {
      this.isNewPasswordDialogShown = true;
    } else {
      this.saveDatabase(null);
    }
  }

  saveNewDatabase(newPassword: string) {
    this.saveDatabase(newPassword);
    this.isNewPasswordDialogShown = false;
  }

  openDeleteEntryWindow() {
    this.isRemoveEntryDialogShown = true;
  }

  openDeleteGroupWindow() {
    this.isConfirmGroupRemoveDialogShown = true;
  }

  openEditEntryWindow() {
    if (this.isDialogOpened) {
      return;
    }
    this.dialogRef = this.dialogService.open(EntryFormComponent, {width: '70%', header: 'Edit entry', data: this.selectedPasswords[0]});
    this.initDialogOpen();
  }

  openAddEntryWindow() {
    if (this.isDialogOpened) {
      return;
    }
    this.dialogRef = this.dialogService.open(EntryFormComponent, {width: '70%', header: 'Add new entry'});
    this.initDialogOpen();
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
      this.swapElements<PasswordEntry>(groupData, elIdx, elIdx - 1);
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
      this.swapElements<PasswordEntry>(groupData, elIdx, elIdx + 1);
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

  exitApp() {
    window.onbeforeunload = undefined;
    this.electronService.ipcRenderer.send('exit');
  }

  copyToClipboard(entry: PasswordEntry, property: string) {
    if (!property) {
      return;
    }
    this.electronService.ipcRenderer.send('copyToClipboard', property);
    entry.lastAccessDate = new Date();
    this.messageService.clear();
    this.messageService.add({
      severity: 'success',
      summary: 'Copied to clipboard!',
      life: 15000,
      detail: 'clipboard'
    });
  }

  private swapElements<T>(array: T[], i1: number, i2: number) {
    let savedElement: T;
    savedElement = {...array[i1]};
    array[i1] = array[i2];
    array[i2] = savedElement;
  }

  private initDialogOpen() {
    this.isDialogOpened = true;
    this.dialogRef.onDestroy.subscribe(() => {
      this.isDialogOpened = false;
    });
  }

  private filterEntries(passwords: PasswordEntry[], phrase: string): PasswordEntry[] {
    if (!phrase) {
      return passwords;
    }
    const tempData: PasswordEntry[] = [];
    this.buildAllEntriesList(this.groups[0], tempData, phrase);
    return tempData;
  }

  private buildAllEntriesList(node: TreeNode, output: PasswordEntry[] & any, phrase: string) {
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
        this.buildAllEntriesList(element, output, phrase);
      });
    } else {
      return output;
    }
  }

  private buildPath(node: TreeNode, path: string[]) {
    path.push(node.label);
    if (node.parent) {
      this.buildPath(node.parent, path);
    } else {
      return;
    }
  }

  private loadTestData() {
    const mocks = require('../mocks/MOCK_DATA.json');
    const shuffledMocks = mocks.sort(() => 0.5 - Math.random());
    this.groups[0].data = (shuffledMocks as PasswordEntry[]).splice(500, 20);
    this.groups[0].children.forEach((_, index) => {
      this.groups[0].children[index].data = (shuffledMocks as PasswordEntry[]).splice(index * 20, 20);
    });
    this.setDateSaved();
  }

    // create tree handler static class
    private findRow(node: TreeNode, id?: string): PasswordEntry[] {
      if (!id) {
        return node.data;
      }
      if (node.data.find(e => e.id === id)) {
        return node.data;
      } else if (node.children != null) {
        var i;
        var result = null;
        for (i=0; result == null && i < node.children.length; i++) {
          result = this.findRow(node.children[i], id);
        }
        return result;
      }
      return null;
    }
  
    private findRowGroup(node: TreeNode, targetGroup: string): PasswordEntry[] {
      if (node.key === targetGroup) {
        return node.data;
      } else if (node.children != null) {
        var i;
        var result = null;
        for (i=0; result == null && i < node.children.length; i++) {
          result = this.findRowGroup(node.children[i], targetGroup);
        }
        return result;
      }
      return null;
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
  
    private setDateSaved() {
      this.dateSaved = new Date();
    }
}