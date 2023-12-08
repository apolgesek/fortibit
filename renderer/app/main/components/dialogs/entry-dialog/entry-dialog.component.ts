import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ComponentRef, DestroyRef, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupId } from '@app/core/enums';
import { ClipboardService, ConfigService, EntryManager, GroupManager, ModalRef, NotificationService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { PasswordStrengthMeterComponent } from '@app/shared/components/password-strength-meter/password-strength-meter.component';
import { DateMaskDirective } from '@app/shared/directives/date-mask.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { Configuration } from '@config/configuration';
import { HistoryEntry, PasswordEntry, IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import * as zxcvbn from 'zxcvbn';

export type EntryDialogDataPayload = {
  decryptedPassword: string;
  config?: {
    readonly: boolean
  };
  historyEntry?: HistoryEntry;
}

@Component({
  selector: 'app-entry-dialog',
  templateUrl: './entry-dialog.component.html',
  styleUrls: ['./entry-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    ModalComponent,
    DateMaskDirective,
    TooltipDirective,
    PasswordStrengthMeterComponent
  ],
})
export class EntryDialogComponent implements IModal, OnInit, AfterViewInit, OnDestroy {
  @ViewChild('entryForm') entryForm: ElementRef;
  @ViewChildren('passwordInput') passwordInputs: QueryList<ElementRef>;

  public passwordScore = -1;
  public config: Configuration;
  public saveLocked = false;
  public isVisible = true;
  public isReadOnly = false;
  public passwordVisible = false;

  public readonly ref!: ComponentRef<EntryDialogComponent>;
  public readonly additionalData!: IAdditionalData<EntryDialogDataPayload>;
  public readonly isControlInvalid = isControlInvalid;

  private readonly destroyRef = inject(DestroyRef);
  private readonly messageBroker = inject(MessageBroker);
  private readonly configService = inject(ConfigService);
  private readonly clipboardService = inject(ClipboardService);
  private readonly modalRef = inject(ModalRef);
  private readonly entryManager = inject(EntryManager);
  private readonly groupManager = inject(GroupManager);
  private readonly notificationService = inject(NotificationService);
  private readonly cdRef = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  private readonly _newEntryForm = this.fb.group({
    id: [null],
    title: ['', Validators.required],
    username: [''],
    passwords: this.fb.group({
      password: ['', Validators.required],
      repeatPassword: [''],
    }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
    url: [''],
    notes: [''],
    autotypeExp: [''],
    creationDate: [null as number | Date],
  });

  private lastTrigger: 'click' | 'keydown';

  get newEntryForm() {
    return this._newEntryForm;
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

  get entryGroupName(): string {
    return this.entryManager.editedEntry
      ? this.entryManager.editedEntry?.group
      : this.groupManager.selectedGroup !== GroupId.AllItems
        ? this.groupManager.selectedGroupName
        : this.groupManager.groups.find(g => g.id === GroupId.Root).name;
  }

  get passwordLength(): number {
    return this.newEntryForm.controls.passwords.controls.password?.value?.length;
  }

  get passwordsGroup() {
    return this.newEntryForm.controls.passwords;
  }

  get title() {
    return this.newEntryForm.controls.title;
  }

  ngOnInit() {
    if (this.additionalData.payload?.config?.readonly) {
      this.isReadOnly = true;
    }

    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.config = config;
      const passwordMask = new Array(this.additionalData?.payload.decryptedPassword?.length
        ?? Math.ceil(this.config.encryption.passwordLength / 2)).fill('*').join('');

      this.newEntryForm.controls.passwords.controls.password.patchValue(passwordMask);
      this.newEntryForm.controls.passwords.controls.repeatPassword.patchValue(passwordMask);

      this.prefillForm();
    });
  }

  ngAfterViewInit() {
    this.passwordInputs.forEach(el => {
      fromEvent(el.nativeElement, 'keydown')
        .pipe(
          filter((e: KeyboardEvent) => e.ctrlKey && e.key === 'z'),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((event: KeyboardEvent) => {
          event.preventDefault();
        });
    });

    fromEvent(document, 'mousedown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.lastTrigger = 'click';
      });

    fromEvent(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.lastTrigger = 'keydown';
      });

    fromEvent(this.entryForm.nativeElement, 'focusin')
      .pipe(
        filter(() => this.lastTrigger === 'keydown'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: FocusEvent) => {
        const parentTop = (this.entryForm.nativeElement as HTMLElement).getBoundingClientRect().top;
        const childTop = (event.target as HTMLElement).getBoundingClientRect().top;

        const y = childTop - parentTop;
        this.entryForm.nativeElement.scrollTo({ top: y - 20 });
      });
  }

  ngOnDestroy(): void {
    this.newEntryForm.reset();
    this.entryManager.editedEntry = null;
  }

  onPasswordChange(event: Event) {
    const password = (event.target as HTMLInputElement).value;
    this.passwordScore = zxcvbn(password).score;
  }

  copyPassword() {
    this.clipboardService.copyEntryDetails(this.entryManager.editedEntry, 'password');
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async restore() {
    await this.entryManager.saveEntry({ ...this.entryManager.editedEntry, icon: null });
    this.notificationService.add({ message: 'Entry restored', type: 'success', alive: 10 * 1000  });
    this.close();
  }

  async delete() {
    const historyEntry = this.additionalData.payload.historyEntry as HistoryEntry;
    await this.entryManager.deleteEntryHistory(historyEntry.id, historyEntry.entry);
    this.notificationService.add({ message: 'History entry removed', type: 'success', alive: 10 * 1000  });
    this.close();
  }

  async addNewEntry() {
    if (!this.groupManager.selectedGroup) {
      throw new Error('No category has been selected!');
    }

    markAllAsDirty(this.newEntryForm);

    if (this.newEntryForm.invalid) {
      const el = (this.entryForm.nativeElement as HTMLElement)
        .querySelector('input.ng-invalid, .form-group.ng-invalid');
      const elToScroll = el.tagName.toLowerCase() === 'div' ? el : el.parentElement;
      elToScroll.scrollIntoView({ block: 'start', inline: 'nearest' });

      return;
    }

    this.saveLocked = true;
    const date = new Date();

    const encryptedPassword = await this.messageBroker.ipcRenderer
      .invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);
    const formData = this.newEntryForm.value;

    if (this.entryManager.editedEntry?.id) {
      if (this.isSame(formData, this.entryManager.editedEntry)) {
        this.close();

        return;
      }

      await this.entryManager.saveEntry({
        id: formData.id,
        title: formData.title,
        username: formData.username,
        url: formData.url,
        notes: formData.notes,
        autotypeExp: formData.autotypeExp,
        password: encryptedPassword,
        lastModificationDate: date,
        icon: this.entryManager.editedEntry.icon,
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
      };

      const id = await this.entryManager.saveEntry(newEntry);
    }

    this.saveLocked = false;
    this.close();
  }

  async close() {
    if (this.entryManager.editedEntry) {
      const encrypted = await this.messageBroker.ipcRenderer
        .invoke(IpcChannel.EncryptPassword, this.newEntryForm.value.passwords.password);

      this.entryManager.editedEntry.password = encrypted;
    }

    this.modalRef.close();
  }

  closeReadOnly() {
    this.modalRef.close();
  }

  async regeneratePassword(): Promise<void> {
    await this.fillNewEntry();
    this.passwordScore = zxcvbn(this.newEntryForm.get('passwords.password').value).score;
    this.notificationService.add({ type: 'success', alive: 5000, message: 'Password regenerated' });
  }

  private async prefillForm() {
    if (this.entryManager.editedEntry) {
      this.fillExistingEntry();
    } else {
      await this.fillNewEntry();
    }

    const password = this.newEntryForm.get('passwords.password')?.value;

    if (password) {
      this.passwordScore = zxcvbn(password).score;
    }

    this.cdRef.detectChanges();
  }

  private getGroup(): number {
    if (this.groupManager.selectedGroup === GroupId.AllItems) {
      return 1;
    } else {
      return this.groupManager.selectedGroup;
    }
  }

  private async fillNewEntry() {
    const password = await this.generatePassword();

    this.newEntryForm.get('passwords')?.patchValue({
      password,
      repeatPassword: password
    });
  }

  private fillExistingEntry() {
    const password = this.additionalData.payload.decryptedPassword;

    this.newEntryForm.patchValue({
      ...this.entryManager.editedEntry,
      passwords: {
        password,
        repeatPassword: password
      }
    });
  }

  private generatePassword(): Promise<string> {
    const settings = this.config.encryption;

    return this.messageBroker.ipcRenderer.invoke(IpcChannel.GeneratePassword, {
      length: settings.passwordLength,
      lowercase: settings.lowercase,
      uppercase: settings.uppercase,
      symbols: settings.specialChars,
      numbers: settings.numbers,
      strict: false,
      excludeSimilarCharacters: true
    });
  }

  private isSame(formData, entry: PasswordEntry): boolean {
    return formData.title === entry.title
      && formData.username === entry.username
      && formData.passwords.password === this.additionalData.payload.decryptedPassword
      && formData.url === entry.url
      && formData.notes === entry.notes
      && formData.autotypeExp === entry.autotypeExp;
  }
}
