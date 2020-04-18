import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ElectronService } from './electron/electron.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PasswordStoreService {

  public passwordList: any[] = [];
  public lifeLeft: number;
  public clearIntervalSource$: Observable<any>;
  public dateSaved: Date;
  public selectedPassword: any;
  public rowIndex: number;

  public isInvalidPassword = false;

  private _passwordListSource: Subject<any> = new Subject<any>();
  private _clearIntervalSource: Subject<any> = new Subject<any>();

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private zone: NgZone
    ) {
    this._passwordListSource.asObservable()
      .pipe().subscribe((data) => {
        this.passwordList = [...this.passwordList, data];
      });

      this.clearIntervalSource$ = this._clearIntervalSource.asObservable().pipe();

      this.electronService.ipcRenderer.on('onContentDecrypt', (_, serializedPasswords: string) => {
        this.zone.run(() => {
          let deserializedPasswords: any[] = [];
          try {
             deserializedPasswords = JSON.parse(serializedPasswords);
             this.isInvalidPassword = false;
             this.router.navigate(['/dashboard']);
          } catch (err) {
            this.isInvalidPassword = true;
            return;
          }
          this.clearAll();
          deserializedPasswords.forEach(entry => {
            this.addEntry(entry);
            this.setDateSaved();
          });
        });
      })
  }

  addEntry(entryModel: any) {
    this._passwordListSource.next(entryModel);
    this.clearDateSaved();
  }

  editEntry(rowIndex: number) {
    // send event to main process
  }

  deleteEntry() {
    this.passwordList.splice(this.rowIndex, 1);
    this.clearDateSaved();
  }

  clearAll() {
    this.passwordList = [];
    this.clearDateSaved();
  }

  clearCounter() {
    this._clearIntervalSource.next();
  }

  clearDateSaved() {
    this.dateSaved = undefined;
  }

  setDateSaved() {
    this.dateSaved = new Date();
  }

}