import { AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AbstractControlOptions, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommunicationService } from '@app/app.module';
import { GroupId } from '@app/core/enums';
import { ICommunicationService } from '@app/core/models';
import { ClipboardService, ConfigService, EntryManager, GroupManager, ModalRef, NotificationService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IHistoryEntry, IPasswordEntry, IpcChannel } from '@shared-renderer/index';
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
  @ViewChild('entryForm') entryForm: ElementRef;
  @ViewChildren('passwordInput') passwordInputs: QueryList<ElementRef>;

  public newEntryForm: FormGroup;
  public passwordScore = -1;
  public config: IAppConfig;
  public saveLocked = false;
  public isVisible = true;
  public isReadOnly = false;

  public readonly ref!: ComponentRef<EntryDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  private readonly destroyed$: Subject<void> = new Subject();
  private lastTrigger: 'click' | 'keydown';

  constructor(
    private readonly fb: FormBuilder,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly configService: ConfigService,
    private readonly clipboardService: ClipboardService,
    private readonly modalRef: ModalRef,
    private readonly entryManager: EntryManager,
    private readonly groupManager: GroupManager,
    private readonly notificationService: NotificationService
  ) {
    this.newEntryForm = this.fb.group({
      id: [null],
      title: [null, Validators.required],
      username: [null],
      passwords: this.fb.group({
        password: [null, Validators.required],
        repeatPassword: [null],
      }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
      url: [null],
      notes: [null],
      autotypeExp: [null],
      creationDate: [null],
      lastAccessDate: [null],
      expirationDate: [null, { validators: this.dateValidator, updateOn: 'blur' } as AbstractControlOptions]
    });
  }

  get header(): string {
    if (this.entryManager.editedEntry) {
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

  get title(): FormControl {
    return this.newEntryForm.get('title') as FormControl;
  }

  get expirationDate(): FormControl {
    return this.newEntryForm.get('expirationDate') as FormControl;
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
    if (this.entryManager.editedEntry) {
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
    this.clipboardService.copyToClipboard(this.entryManager.editedEntry, 'password');
  }

  async restore() {
    await this.entryManager.addOrUpdateEntry(this.entryManager.editedEntry);
    this.notificationService.add({ message: 'Entry has been restored', type: 'success', alive: 5000  });
    this.close();
  }

  async delete() {
    const historyEntry = this.additionalData.payload.historyEntry as IHistoryEntry;
    await this.entryManager.deleteEntryHistory(historyEntry.id, historyEntry.entry);
    this.notificationService.add({ message: 'Entry has been removed', type: 'success', alive: 5000  });
    this.close();
  }

  async addNewEntry() {
    if (!this.groupManager.selectedGroup) {
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

    if (this.entryManager.editedEntry?.id) {
      if (this.isSame(formData, this.entryManager.editedEntry)) {
        this.close();

        return;
      }

      await this.entryManager.addOrUpdateEntry({
        id: formData.id,
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        autotypeExp: formData.autotypeExp,
        password: encryptedPassword,
        lastModificationDate: date,
        iconPath: this.entryManager.editedEntry.iconPath,
        expirationDate: formData.expirationDate
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
        groupId: this.getGroup(),
        isStarred: false,
        expirationDate: formData.expirationDate
      };

      const id = await this.entryManager.addOrUpdateEntry(newEntry);
    }

    this.close();
  }

  private getGroup(): number {
    if (this.groupManager.selectedGroup === GroupId.AllItems) {
      return 1;
    } else {
      return this.groupManager.selectedGroup;
    }
  }

  async close() {
    if (this.entryManager.editedEntry) {
      const encrypted = await this.communicationService.ipcRenderer
        .invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);

      this.entryManager.editedEntry.password = encrypted;
    }

    this.entryManager.editedEntry = null;
    this.newEntryForm.reset();

    this.modalRef.close()
  }

  closeReadOnly() {
    this.modalRef.close();
  }

  private dateValidator(control: FormControl): { [s: string]: boolean } {
    const date = control.value as Date;

    let today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();

    today = new Date(`${month}/${day}/${year}`);

    if (date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return { 'invalidDate': true };
      } else if (date.getTime() < today.getTime()) {
        return { 'pastDate': true };
      } else {
        return null;
      }
    }

    return null;
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
      ...this.entryManager.editedEntry,
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

  private isSame(formData, entry: IPasswordEntry): boolean {
    return formData.title === entry.title
      && formData.username === entry.username
      && formData.passwords.password === this.additionalData.payload.decryptedPassword
      && formData.url === entry.url
      && formData.notes === entry.notes
      && formData.autotypeExp === entry.autotypeExp
      && formData.expirationDate?.getTime() === entry.expirationDate?.getTime();
  }
}
