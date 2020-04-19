import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { ElectronService } from './electron/electron.service';
import { map, shareReplay } from 'rxjs/operators';
import { Subject, combineLatest, BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PasswordStoreService {

  public passwordList: any[] = [];
  public filteredList$: Observable<any[]>;
  public dateSaved: Date;
  public selectedPassword: any;
  public rowIndex: number;
  public isInvalidPassword = false;
  public filePath: string;
  
  private _searchPhraseSource: BehaviorSubject<any> = new BehaviorSubject<any>('');
  private _outputPasswordListSource: Subject<any> = new Subject<any>();

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone,
  ) {
      this.filteredList$ = combineLatest(this._outputPasswordListSource, this._searchPhraseSource).pipe(
        map(([passwords, searchPhrase]) => this.matchEntries(passwords, searchPhrase)),
        shareReplay()
      );

      this.electronService.ipcRenderer.on('onContentDecrypt', (_, { decrypted, file }) => {
        this.zone.run(() => {
          let deserializedPasswords: any[] = [];
          try {
             deserializedPasswords = JSON.parse(decrypted);
             this.isInvalidPassword = false;
             this.filePath = file;
             this.router.navigate(['/dashboard']);
          } catch (err) {
            this.isInvalidPassword = true;
            return;
          }
          this.clearAll();
          this.populateEntries(deserializedPasswords);
          this.setDateSaved();
        });
      })
  }

  addEntry(entryModel: any) {
    if (entryModel.id) {
      let entryIdx = this.passwordList.findIndex(p => p.id === entryModel.id);
      this.passwordList[entryIdx] = entryModel;
    } else {
      this.passwordList.push({...entryModel, id: uuidv4()});
    }
    this._outputPasswordListSource.next(this.passwordList);
    this.clearDateSaved();
  }

  deleteEntry() {
    this.passwordList.splice(this.rowIndex, 1);
    this._outputPasswordListSource.next(this.passwordList);
    this.clearDateSaved();
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
    this.electronService.ipcRenderer.send('saveFile', {passwordList: this.passwordList, newPassword});
    this.setDateSaved();
  }

  private populateEntries(deserializedPasswords: any[]) {
    this.passwordList = deserializedPasswords;
    this._outputPasswordListSource.next(this.passwordList);
  }

  private matchEntries(passwords: any[], phrase: string) {
    if (!phrase) {
      return passwords;
    }
    return passwords.filter(p => {
      return p.title.includes(phrase)
        || p.username.includes(phrase)
        || p.url.includes(phrase)
        || p.notes.includes(phrase);
    });
  }

}