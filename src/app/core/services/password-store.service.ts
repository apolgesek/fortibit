import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { ElectronService } from './electron/electron.service';
import { map, shareReplay } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { TreeNode, ConfirmationService, DialogService } from 'primeng/api';
import { AppConfig } from 'environments/environment';
import { PasswordEntry } from '../models/password-entry.model';
import { NewEntryComponent } from '@app/home/new-entry/new-entry.component';

@Injectable({
  providedIn: 'root'
})
export class PasswordStoreService {

  public filteredList$: Observable<PasswordEntry[]>;
  public dateSaved: Date;
  public selectedPassword: PasswordEntry;
  public draggedEntry: PasswordEntry;
  public selectedCategory: TreeNode;
  public contextSelectedCategory: TreeNode;
  public rowIndex: number;
  public isInvalidPassword = false;
  public filePath: string;
  public isRenameModeOn: boolean;
  public isNewPasswordDialogShown = false;
  public files: TreeNode[] = [{
    label: "Database",
    data: [],
    expanded: true,
    draggable: false,
    children: [
      {
        key: uuidv4(),
        label: "General",
        icon: "pi pi-folder",
        data: [],
      },
      {
        key: uuidv4(),
        label: "Email",
        data: [],
        icon: "pi pi-folder",
      },
      {
        key: uuidv4(),
        label: "Work",
        data: [],
        icon: "pi pi-folder",
      },
      {
        key: uuidv4(),
        label: "Banking",
        data: [],
        icon: "pi pi-folder",
      },
  ]
}];
  
  public searchPhrase$: Observable<string>;
  private _searchPhraseSource: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private _outputPasswordListSource: BehaviorSubject<PasswordEntry[]> = new BehaviorSubject<PasswordEntry[]>([]);

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone,
    private confirmDialogService: ConfirmationService,
    private dialogService: DialogService
  ) {
    this.filteredList$ = combineLatest(this._outputPasswordListSource, this._searchPhraseSource).pipe(
      map(([passwords, searchPhrase]) => this.matchEntries(passwords, searchPhrase)),
      shareReplay()
    );

    this.searchPhrase$ = this._searchPhraseSource.asObservable().pipe();

      this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
        this.zone.run(() => {
          try {
            const deserializedPasswords = JSON.parse(decrypted);
            this.isInvalidPassword = false;
            this.filePath = file;
            this.clearAll();
            this.files = deserializedPasswords;
            this.selectedCategory = this.files[0];
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
  }

  addEntry(entryModel: PasswordEntry) {
    if (entryModel.id) {
      const catalogData = this.findRow(this.files[0]);
      let entryIdx = catalogData.findIndex(p => p.id === entryModel.id);
      catalogData[entryIdx] = {...entryModel, id: uuidv4()};
      this.selectedPassword = catalogData[entryIdx];
    } else {
      this.selectedCategory.data.push({...entryModel, id: uuidv4()});
      this.resetSearch();
    }

    this.notifyStream();
    this.clearDateSaved();
  }

  deleteEntry() {
    const catalogData = this.findRow(this.files[0]);
    const idx = catalogData.findIndex(e => e.id === (this.draggedEntry || this.selectedPassword).id);
    catalogData.splice(idx, 1);
    this.selectedPassword = undefined;
    this.notifyStream();
    this.clearDateSaved();
  }

  // create tree handler static class
  private findRow(node: TreeNode): PasswordEntry[] {
    if (node.data.find(e => e.id === (this.draggedEntry || this.selectedPassword).id)) {
      return node.data;
    } else if (node.children != null) {
      var i;
      var result = null;
      for (i=0; result == null && i < node.children.length; i++) {
        result = this.findRow(node.children[i]);
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

  filterEntries(value: string) {
    this._searchPhraseSource.next(value);
  }

  clearAll() {
    this.files = [];
    this.clearDateSaved();
  }

  clearDateSaved() {
    this.dateSaved = undefined;
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

  saveDatabase(newPassword: string) {
    this.electronService.ipcRenderer.send('saveFile', {passwordList: this.files, newPassword});
    this.setDateSaved();
  }

  notifyStream() {
    this._outputPasswordListSource.next(this.selectedCategory.data);
  }

  resetSearch() {
    this._searchPhraseSource.next('');
  }

  removeGroup() {
    let idx = this.selectedCategory.parent.children.findIndex(g => g.key === this.contextSelectedCategory.key);
    this.selectedCategory.parent.children.splice(idx, 1);
    this.selectedCategory = this.files[0];
  }

  renameGroup() {
    this.isRenameModeOn = true;
  }

  addGroup() {
    this.files[0].children.push({key: uuidv4(), label: 'New Group', data: [], icon: "pi pi-folder"});
  }

  moveEntry(targetGroup: string) {
    const copy = {...this.draggedEntry};
    this.deleteEntry();
    const groupData = this.findRowGroup(this.files[0], targetGroup);
    groupData.push(copy);
    this.notifyStream();
  }

  trySaveDatabase() {
    if (!this.filePath) {
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
    this.confirmDialogService.confirm({
      message: 'Are you sure you want to delete this entry?',
      accept: () => {
        this.deleteEntry();
      }
    });
  }

  openEditEntryWindow() {
    this.dialogService.open(NewEntryComponent, {width: '70%', header: 'Edit entry', data: this.selectedPassword});
  }

  openAddEntryWindow() {
    this.dialogService.open(NewEntryComponent, {width: '70%', header: 'Add new entry'});
  }

  private matchEntries(passwords: PasswordEntry[], phrase: string): PasswordEntry[] {
    if (!phrase) {
      return passwords;
    }
    const tempData: PasswordEntry[] = [];
    this.buildAllEntriesList(this.files[0], tempData, phrase);
    return tempData;
  }

  private buildAllEntriesList(node: TreeNode, output: PasswordEntry[] & any, phrase: string) {
    if (node.data.length) {
      const filteredNodes: PasswordEntry[] = node.data
        .filter(p => (p.title.includes(phrase) || p.username.includes(phrase) || p.url?.includes(phrase)));
      if (filteredNodes.length) {
        const path: string[] = [];
        this.buildPath(node, path);
        output.push({ name: path.reverse().join('/'), isCatalog: true });
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
    this.files[0].data = (shuffledMocks as any[]).splice(500, 20);
    this.files[0].children.forEach((el, index) => {
      el.data = (shuffledMocks as any[]).splice(index * 20, 20);
    });
    this.selectedCategory = this.files[0];
    this.setDateSaved();
  }

}