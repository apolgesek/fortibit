import { Injectable } from '@angular/core';
import { AppConfig } from 'environments/environment';
import { TreeNode } from 'primeng-lts/api';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { markDirty } from '../decorators/mark-dirty.decorator';
import { IPasswordEntry } from '../models/password-entry.model';
import { ArrayUtils } from '../utils';
import { ElectronService } from './electron/electron.service';
import { MockDataService } from './mock-data.service';
import { ISearchResultGroup, SearchResult, SearchService } from './search.service';
import { v4 as uuidv4 } from 'uuid';

const nameof = <T>(name: keyof T) => name;
type treeNodeEventObject = { node: TreeNode };

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  public readonly entries$: Observable<SearchResult[]>;
  public readonly entryIndex: number;
  public entriesFound$: Observable<number>;

  public dateSaved: Date;
  public selectedPasswords: IPasswordEntry[] = [];
  public draggedEntry: IPasswordEntry[] = [];
  public selectedCategory: TreeNode;
  public editedEntry: IPasswordEntry;
  public contextSelectedCategory: TreeNode;
  public isRenameModeOn = false;
  public file: { filePath: string, filename: string };
  public groups: TreeNode[];

  get databaseFileName(): string {
    return this.file?.filename ?? '*New db';
  }
  
  private passwordListSource: BehaviorSubject<IPasswordEntry[]> = new BehaviorSubject<IPasswordEntry[]>([]);

  constructor(
    private electronService: ElectronService,
    private searchService: SearchService
  ) {
    this.entries$ = combineLatest([
      this.passwordListSource,
      this.searchService.searchPhrase$
    ]).pipe(
      map(([ passwords, searchPhrase ]) => this.searchService.filterEntries(passwords, searchPhrase, this.groups[0])),
      shareReplay()
    );

    this.entriesFound$ = this.entries$
      .pipe(map((entries) => entries.filter(e => !(e as ISearchResultGroup).groupPath).length));

    this.groups = [{
      key: uuidv4(),
      label: 'Database',
      expanded: true,
      expandedIcon: 'pi pi-folder-open',
      draggable: false,
      data: [],
      children: [
        this.buildGroup('General'),
        this.buildGroup('Email'),
        this.buildGroup('Work'),
        this.buildGroup('Banking'),
      ]
    }];

    if (AppConfig.mocks) {
      MockDataService.loadMockedEntries(this.groups[0]);
    }

    this.setDateSaved();
    this.selectedCategory = this.groups[0];
  }

  //#region mark dirty methods
  @markDirty()
  addEntry(entryModel: IPasswordEntry) {
    if (entryModel.id) {
      const catalogData = this.findRow(this.groups[0], entryModel.id);
      const entryIdx = catalogData.findIndex(p => p.id === entryModel.id);
      catalogData[entryIdx] = {...entryModel, id: uuidv4()}; // update id for entries table change detection
      this.selectedPasswords = [catalogData[entryIdx]];
    } else {
      this.selectedCategory.data.push({...entryModel, id: uuidv4()});
      this.searchService.reset();
    }
    this.updateEntries();
  }

  @markDirty()
  deleteEntry() {
    if (this.selectedPasswords.length === 0) { // drag entry when it's not selected first
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
    const index = this.selectedCategory.parent.children.findIndex(g => g.key === this.contextSelectedCategory.key);
    this.selectedCategory.parent.children.splice(index, 1);
    this.selectedCategory = this.groups[0];
  }

  @markDirty()
  renameGroup() {
    this.isRenameModeOn = true;
    requestAnimationFrame(() => {
      (<HTMLInputElement>document.querySelector('.group-name-input')).focus();
    });
  }

  @markDirty()
  addGroup() {
    if (!this.selectedCategory.children) {
      this.selectedCategory.children = [];
    }
  
    this.selectedCategory.children.push(this.buildGroup('New group'));
    this.selectedCategory.expanded = true;

    const addedGroup = this.selectedCategory.children.slice(-1)[0];
    this.contextSelectedCategory = addedGroup;
    this.selectGroup({ node: addedGroup } as treeNodeEventObject);
    this.renameGroup();
  }

  @markDirty()
  moveUp() {
    ArrayUtils.moveElementsLeft<IPasswordEntry>(
      this.selectedCategory.data,
      this.selectedPasswords,
      nameof<IPasswordEntry>('id')
    );
  }

  @markDirty()
  moveDown() {
    ArrayUtils.moveElementsRight<IPasswordEntry>(
      this.selectedCategory.data,
      this.selectedPasswords,
      nameof<IPasswordEntry>('id')
    );
  }

  @markDirty()
  moveTop() {
    const groupData = (this.selectedCategory.data as IPasswordEntry[]);    
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      groupData.splice(elIdx, 1);
      groupData.unshift(element);
    });
  }

  @markDirty()
  moveBottom() {
    const groupData = (this.selectedCategory.data as IPasswordEntry[]);
    this.selectedPasswords.forEach(element => {
      const elIdx = groupData.findIndex(e => e.id === element.id);
      groupData.splice(elIdx, 1);
      groupData.push(element);
    });
  }
  //#endregion

  selectGroup(event: treeNodeEventObject) {
    this.selectedCategory = event.node;
    this.selectedCategory.data = event.node.data || [];
    this.selectedPasswords = [];
    this.searchService.reset();
    this.updateEntries();
    document.querySelector('.password-table');
  }

  saveDatabase(newPassword: string) {
    this.electronService.ipcRenderer.send('saveFile', { passwordList: this.groups, newPassword });
    this.setDateSaved();
  }

  updateEntries() {
    this.passwordListSource.next(this.selectedCategory.data);
  }

  moveEntry(targetGroup: string) {
    const copy = [...this.draggedEntry];
    this.deleteEntry();
    const groupData = this.findRowGroup(this.groups[0], targetGroup);
    groupData.push(...copy);
    this.updateEntries();
  }

  saveNewDatabase(newPassword: string) {
    this.saveDatabase(newPassword);
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

  private findRow(node: TreeNode, id?: string): IPasswordEntry[] {
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
  
  private findRowGroup(node: TreeNode, targetGroupKey: string): IPasswordEntry[] {
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
      collapsedIcon: 'pi pi-folder',
      expandedIcon: 'pi pi-folder-open'
    };
  }
}