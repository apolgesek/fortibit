import { AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ConfigService } from '@app/core/services';
import { ModalManager } from '@app/core/services/modal-manager';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { generate } from 'generate-password';
import { fromEvent, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { IAppConfig } from '../../../../../../app-config';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryDialogComponent implements IModal, OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('passwordInput') passwordInputs: QueryList<ElementRef>;

  public newEntryForm: FormGroup;
  public passwordScore = -1;
  public config: IAppConfig;
  public saveLocked = false;

  public readonly ref!: ComponentRef<EntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  private readonly destroyed$: Subject<void> = new Subject();

  constructor(
    private readonly fb: FormBuilder,
    private readonly storageService: StorageService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly modalManager: ModalManager,
  ) {
    this.newEntryForm = this.fb.group({
      id: [null],
      title: [null],
      username: [null],
      passwords: this.fb.group({
        password: [null, Validators.required],
        repeatPassword: [null],
      }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
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
    return this.newEntryForm.get('passwords.password')?.value?.length;
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

  get passwordsGroup(): FormGroup {
    return this.newEntryForm.get('passwords') as FormGroup;
  }

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config;

      this.prefillForm();
    });

    fromEvent(window, 'keydown').pipe(takeUntil(this.destroyed$)).subscribe((event: Event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        this.close();
      }
    });
  }

  private prefillForm() {
    if (this.storageService.editedEntry) {
      this.fillExistingEntry();
    } else {
      this.fillNewEntry();
    }

    const password = this.newEntryForm.get('passwords.password')?.value;

    if (password) {
      this.passwordScore = this.communicationService.zxcvbn(password).score;
    }
  }

  ngAfterViewInit() {
    this.passwordInputs.forEach(el => {
      fromEvent(el.nativeElement, 'keydown')
        .pipe(
          filter((e: KeyboardEvent) => e.ctrlKey && e.key === 'z'),
          takeUntil(this.destroyed$)
        )
        .subscribe((event: KeyboardEvent) => {
          event.preventDefault();
        });
    });
  }

  onPasswordChange(event: Event) {
    const password = (event.target as HTMLInputElement).value;
    this.passwordScore = this.communicationService.zxcvbn(password).score;
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  async addNewEntry() {
    if (!this.storageService.selectedCategory) {
      throw new Error('No category has been selected!');
    }

    markAllAsDirty(this.newEntryForm);

    if (this.newEntryForm.invalid) {
      return;
    }

    this.saveLocked = true;

    const encryptedPassword = await this.communicationService.ipcRenderer.invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);
    const formData = this.newEntryForm.value;

    if (this.storageService.editedEntry?.id) {
      await this.storageService.addOrUpdateEntry({
        id: formData.id,
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        password: encryptedPassword,
        lastModificationDate: new Date(),
        iconPath: this.storageService.editedEntry.iconPath
      });

    } else {
      const newEntry = {
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        password: encryptedPassword,
        creationDate: new Date(),
        groupId: this.storageService.selectedCategory.data.id,
        isStarred: false,
      };

      const id = await this.storageService.addOrUpdateEntry(newEntry);
    }

    this.close();
  }

  async close() {
    if (this.storageService.editedEntry) {
      const encrypted = await this.communicationService.ipcRenderer
        .invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);

      this.storageService.editedEntry.password = encrypted;
    }

    this.storageService.editedEntry = null;
    this.newEntryForm.reset();

    this.modalManager.close(this.ref);
  }

  private fillNewEntry() {
    const password = this.generatePassword();

    this.newEntryForm.get('passwords')?.patchValue({
      password: password,
      repeatPassword: password
    });
  }

  private fillExistingEntry() {
    const password = this.additionalData.payload;

    this.newEntryForm.patchValue({
      ...this.storageService.editedEntry,
      passwords: {
        password: password,
        repeatPassword: password
      }
    });
  }

  private generatePassword(): string {
    const settings = this.config.encryption;

    return generate({
      length: settings.passwordLength,
      lowercase: settings.lowercase,
      uppercase: settings.uppercase,
      symbols: settings.specialChars,
      numbers: settings.numbers,
      strict: false,
      excludeSimilarCharacters: true
    });
  }
}
