import { AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ClipboardService, ConfigService, ModalRef } from '@app/core/services';
import { StorageService } from '@app/core/services/managers/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IPasswordEntry, IpcChannel } from '@shared-renderer/index';
import { generate } from 'generate-password';
import { fromEvent, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { urlToHttpOptions } from 'url';
import { IAppConfig } from '../../../../../../app-config';

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryDialogComponent implements IModal, OnInit, AfterViewInit, OnDestroy {
  @ViewChild('entryForm') entryForm: ElementRef;
  @ViewChildren('passwordInput') passwordInputs: QueryList<ElementRef>;

  public newEntryForm: FormGroup;
  public passwordScore = -1;
  public config: IAppConfig;
  public saveLocked = false;
  public isVisible = false;
  public isReadOnly = false;

  public readonly ref!: ComponentRef<EntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  private readonly destroyed$: Subject<void> = new Subject();
  private lastTrigger: 'click' | 'keydown';

  constructor(
    private readonly fb: FormBuilder,
    private readonly storageService: StorageService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly clipboardService: ClipboardService,
    private readonly modalRef: ModalRef,
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
      autotypeExp: [null],
      creationDate: [null],
      lastAccessDate: [null]
    });
  }

  get header(): string {
    if (this.storageService.editedEntry) {
     if (!this.isReadOnly) {
        return 'Edit entry';
      } else {
        return 'Entry history';
      }
    } else {
      return 'Add entry';
    }
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
    if (this.additionalData.payload?.config?.readonly) {
      this.isReadOnly = true;
    }

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

    fromEvent(document, 'mousedown').pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.lastTrigger = 'click';
      });

    fromEvent(document, 'keydown').pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.lastTrigger = 'keydown';
      });

    fromEvent(this.entryForm.nativeElement, 'focusin')
      .pipe(
        filter(() => this.lastTrigger === 'keydown'),
        takeUntil(this.destroyed$)
      )
      .subscribe((event: FocusEvent) => {
        const parentTop = (this.entryForm.nativeElement as HTMLElement).getBoundingClientRect().top;
        const childTop = (event.target as HTMLElement).getBoundingClientRect().top;

        const y = childTop - parentTop;
        this.entryForm.nativeElement.scrollTo({ top: y - 20 });
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

  copyPassword() {
    this.clipboardService.copyToClipboard(this.storageService.editedEntry, 'password');
  }

  async restore() {
    await this.storageService.addOrUpdateEntry(this.storageService.editedEntry);
    this.close();
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
    const date = new Date();

    const encryptedPassword = await this.communicationService.ipcRenderer.invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);
    const formData = this.newEntryForm.value;

    if (this.storageService.editedEntry?.id) {
      await this.storageService.addOrUpdateEntry({
        id: formData.id,
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        autotypeExp: formData.autotypeExp,
        password: encryptedPassword,
        lastModificationDate: date,
        iconPath: this.storageService.editedEntry.iconPath
      });
    } else {
      const newEntry = {
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        autotypeExp: formData.autotypeExp,
        password: encryptedPassword,
        creationDate: date,
        lastModificationDate: date,
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

    this.modalRef.close()
  }

  closeReadOnly() {
    this.modalRef.close();
  }

  private fillNewEntry() {
    const password = this.generatePassword();

    this.newEntryForm.get('passwords')?.patchValue({
      password: password,
      repeatPassword: password
    });
  }

  private fillExistingEntry() {
    const password = this.additionalData.payload.decryptedPassword;

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
