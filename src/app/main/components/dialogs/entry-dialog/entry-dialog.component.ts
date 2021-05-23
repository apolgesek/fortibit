import { AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalService } from '@app/core/services/modal.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { IpcChannel } from '@shared-models/*';
import { fromEvent, Subject } from 'rxjs';
import { skipWhile, takeUntil } from 'rxjs/operators';
import { IAdditionalData, IModal } from '@app/shared';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryDialogComponent implements IModal, OnInit, AfterViewInit, OnDestroy {
  public newEntryForm: FormGroup;
  public passwordScore = -1;

  public readonly ref!: ComponentRef<EntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,
    private electronService: ElectronService,
    private el: ElementRef,
    private modalService: ModalService,
  ) {
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
  }

  get header(): string {
    return this.storageService.editedEntry ? 'Edit entry' : 'Add entry';
  }

  get passwordLength(): number {
    return this.newEntryForm.get('password')?.value?.length;
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

  ngOnInit() {
    fromEvent(window, 'keydown').subscribe((event: Event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        this.close();
      }
    });

    if (this.storageService.editedEntry) {
      this.newEntryForm.patchValue({
        ...this.storageService.editedEntry,
        password: this.additionalData.payload
      });
    }

    const password = this.newEntryForm.get('password')?.value;

    if (password) {
      this.passwordScore = this.electronService.zxcvbn(password).score;
    }
  }

  onPasswordChange(event: Event) {
    const password = (event.target as HTMLInputElement).value;
    this.passwordScore = this.electronService.zxcvbn(password).score;
  }

  ngAfterViewInit(): void {
    Array.from(this.el.nativeElement.querySelectorAll('input')).forEach(el => {
      fromEvent(el as HTMLInputElement, 'keydown')
        .pipe(
          skipWhile((e: Event) => (e as KeyboardEvent).repeat === true),
          takeUntil(this.destroyed$)
        ).subscribe((e: Event) => {
          if ((e as KeyboardEvent).key === 'Enter') {
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
    const control = this.newEntryForm?.get(controlName) as AbstractControl;
    return control.invalid && control.dirty;
  }

  async addNewEntry() {
    if (!this.storageService.selectedCategory) {
      throw new Error('No category has been selected!');
    }

    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      const encryptedPassword = await this.electronService.ipcRenderer.invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.password);
      if (this.storageService.editedEntry?.id) {
        await this.storageService.addEntry({
          ...this.newEntryForm.value,
          password: encryptedPassword,
          groupId: this.storageService.selectedCategory.data.id,
          lastModificationDate: new Date()
        });
      } else {
        const newEntry = {
          ...this.newEntryForm.value,
          password: encryptedPassword,
          creationDate: new Date(),
          groupId: this.storageService.selectedCategory.data.id
        };

        newEntry.id = undefined;
        await this.storageService.addEntry(newEntry);
      }

      this.close();
    }
  }

  async close() {
    if (this.storageService.editedEntry) {
      const encrypted = await this.electronService.ipcRenderer
        .invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.password);

      this.storageService.editedEntry.password = encrypted;
    }

    this.storageService.editedEntry = undefined;
    this.newEntryForm.reset();

    this.modalService.close(this.ref);
  }
}
