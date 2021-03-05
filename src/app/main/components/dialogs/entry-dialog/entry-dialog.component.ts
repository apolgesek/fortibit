import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng-lts/dynamicdialog';
import { fromEvent, Subject } from 'rxjs';
import { skipWhile, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  public newEntryForm: FormGroup;
  public passwordScore;
  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private fb: FormBuilder,
    private ref: DynamicDialogRef,
    private config: DynamicDialogConfig,
    private storageService: StorageService,
    private electronService: ElectronService,
    private el: ElementRef,
  ) { }

  get header(): string {
    return this.storageService.editedEntry ? 'Edit entry' : 'Add entry';
  }

  get passwordLength(): number {
    return this.newEntryForm.get('password').value?.length;
  }

  get textDescription(): string {
    if (this.passwordLength === 0) {
      return '';
    }

    switch (this.passwordScore) {
    case 0:
      return 'Very weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Medium';
    case 3:
      return 'Strong';
    case 4:
      return 'Very strong';    
    default:
      return '';
    }
  }

  ngOnInit(): void {
    this.initEntryForm();
  }

  onPasswordChange(password: string) {
    this.passwordScore = this.electronService.zxcvbn(password).score;
  }

  ngAfterViewInit(): void {
    Array.from(this.el.nativeElement.querySelectorAll('input')).forEach(el => {
      fromEvent(el as HTMLInputElement, 'keydown')
        .pipe(
          skipWhile((e: KeyboardEvent) => e.repeat === true),
          takeUntil(this.destroyed$)
        ).subscribe((e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            this.addNewEntry();
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.newEntryForm?.get(controlName);
    return control.invalid && control.dirty;
  }

  async initEntryForm() {
    this.newEntryForm = this.fb.group({
      id: [null],
      title: [null],
      username: [null, Validators.required],
      password: [null, Validators.required],
      url: [null],
      notes: [null],
      creationDate: [null],
      lastAccessDate: [null]
    });

    if (this.storageService.editedEntry) {
      this.newEntryForm.patchValue({...this.storageService.editedEntry, password: this.config.data.decryptedPassword});
    }
  }

  async addNewEntry() {
    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      const encryptedPassword = await this.electronService.ipcRenderer.invoke('encryptPassword', this.newEntryForm.value.password);
      if (this.storageService.editedEntry?.id) {
        this.storageService.addEntry({ ...this.newEntryForm.value, password: encryptedPassword });
      } else {
        this.storageService.addEntry({ ...this.newEntryForm.value, password: encryptedPassword, creationDate: new Date() });
      }

      this.close();
    }
  }

  async close() {
    if (this.storageService.editedEntry) {
      const encrypted = await this.electronService.ipcRenderer
        .invoke('encryptPassword', this.newEntryForm.value.password);

      this.storageService.editedEntry.password = encrypted;
    }

    this.storageService.editedEntry = undefined;
    this.newEntryForm.reset();

    this.ref.close();
  }
}
