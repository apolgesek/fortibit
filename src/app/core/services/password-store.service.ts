import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { ElectronService } from './electron/electron.service';
import { map, shareReplay, filter } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { TreeNode } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class PasswordStoreService {

  public passwordList: any[] = [];
  public filteredList$: Observable<any[]>;
  public dateSaved: Date;
  public selectedPassword: any;
  public selectedCategory: TreeNode;
  public contextSelectedCategory: TreeNode;
  public rowIndex: number;
  public isInvalidPassword = false;
  public filePath: string;
  public isRenameModeOn: boolean;
  public draggedEntry: any;
  public files: TreeNode[] = [{
    label: "Database",
    data: [],
    expanded: true,
    draggable: false,
    children: [
      {
        label: "General",
        "icon": "pi pi-folder",
        data: [],
      },
      {
        "label": "Email",
        "data": [{id: uuidv4(), title: 'aaa', username: 'Arek', url: 'htttp://google.com', notes: 'aisdahss'}],
        "icon": "pi pi-folder",
      },
      {
        "label": "Work",
        "data": [],
        "icon": "pi pi-folder",
      },
      {
        "label": "Banking",
        "data": [],
        "icon": "pi pi-folder",
      },
  ]
}];
  
  private _searchPhraseSource: BehaviorSubject<any> = new BehaviorSubject<any>('');
  private _outputPasswordListSource: BehaviorSubject<any> = new BehaviorSubject<any>([]);

  public searchPhrase$: Observable<string>;

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone,
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
             this.setDateSaved();
             this.files = deserializedPasswords;
             this.populateList();
             this.router.navigate(['/dashboard']);
          } catch (err) {
            this.isInvalidPassword = true;
            return;
          }
        });
      })
  }

  addEntry(entryModel: any) {
    if (entryModel.id) {
      const catalogData = this.findRow(this.files[0]);
      let entryIdx = catalogData.findIndex(p => p.id === entryModel.id);
      catalogData[entryIdx] = entryModel;
    } else {
      this.selectedCategory.data.push({...entryModel, id: uuidv4()});
      this.resetSearch();
    }
    this.notifyStream();
    this.clearDateSaved();
  }

  deleteEntry() {
    const catalogData = this.findRow(this.files[0]);
    const idx = catalogData.findIndex(e => e.id === (this.draggedEntry ?? this.selectedPassword).id);
    catalogData.splice(idx, 1);
    this.notifyStream();
    this.clearDateSaved();
  }

  // create tree handler static class
  private findRow(node: TreeNode): any[] {
    if (node.data.find(e => e.id === (this.draggedEntry ?? this.selectedPassword).id)) {
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

  private findRowGroup(node: TreeNode, targetGroup: string): any[] {
    if (node.label === targetGroup) {
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
    this.passwordList = [];
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
    this._outputPasswordListSource.next(this.passwordList);
  }

  resetSearch() {
    this._searchPhraseSource.next('');
  }

  removeGroup() {
    let idx = this.selectedCategory.parent.children.findIndex(g => g.label === this.contextSelectedCategory.label);
    this.selectedCategory.parent.children.splice(idx, 1);
    this.selectedCategory = this.files[0];
  }

  renameGroup() {
    this.isRenameModeOn = true;
  }

  addGroup() {
    this.files[0].children.push({label: 'New Group', data: [], icon: "pi pi-folder"});
  }

  moveEntry(targetGroup: string) {
    const copy = {...this.draggedEntry};
    this.deleteEntry();
    const groupData = this.findRowGroup(this.files[0], targetGroup);
    groupData.push(copy);
    this.notifyStream();
  }

  private matchEntries(passwords: any[], phrase: string): any[] {
    if (!phrase) {
      return passwords;
    }
    const tempData: any[] = [];
    this.buildAllEntriesList(this.files[0], tempData, phrase);
    return tempData;
  }

  private buildAllEntriesList(node: TreeNode, output: any[], phrase: string) {
    if (node.data.length) {
      const filteredNodes: any[] = node.data.filter(p => (p.title.includes(phrase) || p.username.includes(phrase) || p.url.includes(phrase)));
      if (filteredNodes.length) {
        const path: string[] = [];
        this.buildPath(node, path);
        output.push({ name: path.reverse().join('/'), isCatalog: true });
        output.push(...node.data);
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

  private populateList() {
    this.selectedCategory = this.files[0];
    this.passwordList = this.selectedCategory.data || [];
    this.notifyStream();
  }

}