import { CommonModule, NgComponentOutlet } from '@angular/common';
import {
	AfterViewInit,
	Component,
	ComponentRef,
	DestroyRef,
	ElementRef,
	OnDestroy,
	OnInit,
	Type,
	ViewChild,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	FormBuilder,
	FormControl,
	FormGroup,
	ReactiveFormsModule,
	Validators,
} from '@angular/forms';
import { GroupId } from '@app/core/enums';
import {
	ConfigService,
	EntryManager,
	GroupManager,
	ModalRef,
	NotificationService,
} from '@app/core/services';
import { IEntryTypeComparer } from '@app/core/services/comparers/entry-type-comparer';
import { PasswordEntryTypeComparer } from '@app/core/services/comparers/password-entry.comparer';
import { IEntryTypeMapper } from '@app/core/services/mappers/entry-type-mapper';
import { PasswordEntryMapper } from '@app/core/services/mappers/password-entry.mapper';
import { PasswordEntryPartialFormComponent } from '@app/main/components/dialogs/entry-dialog/forms/password-entry-partial-form/password-entry-partial-form.component';
import { EntryDialogDataPayload, IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { PasswordStrengthMeterComponent } from '@app/shared/components/password-strength-meter/password-strength-meter.component';
import { DateMaskDirective } from '@app/shared/directives/date-mask.directive';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { Configuration } from '@config/configuration';
import { Entry, HistoryEntry, PasswordEntry } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

type EntryTypeHandler = Map<
	Entry['type'],
	{
		componentType: Type<any>;
		comparer: IEntryTypeComparer<Entry, any, any>;
		mapper: IEntryTypeMapper<EntryForm['value'], Entry>;
	}
>;

export type PasswordFormGroup = {
	username: FormControl<string>;
	passwords: FormGroup<PasswordsFormGroup>;
	url: FormControl<string>;
	notes: FormControl<string>;
	autotypeExp: FormControl<string>;
	icon: FormControl<string>;
};

export type PasswordsFormGroup = {
	password: FormControl<string>;
	repeatPassword: FormControl<string>;
};

export type EntryForm = FormGroup<{
	id: FormControl<number>;
	groupId: FormControl<number>;
	type: FormControl<Entry['type']>;
	title: FormControl<string>;
	creationDate: FormControl<number | Date>;
	password: FormGroup<PasswordFormGroup>;
	card: FormGroup;
}>;

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
		PasswordStrengthMeterComponent,
		NgComponentOutlet,
		PasswordEntryPartialFormComponent,
	],
})
export class EntryDialogComponent
	implements IModal, OnInit, AfterViewInit, OnDestroy
{
	@ViewChild('entryForm') entryForm: ElementRef;

	public config: Configuration;
	public saveLocked = false;
	public isReadOnly = false;
	public formPartialComponent: Type<any> = PasswordEntryPartialFormComponent;

	public readonly ref!: ComponentRef<EntryDialogComponent>;
	public readonly additionalData!: IAdditionalData<EntryDialogDataPayload>;
	public readonly isControlInvalid = isControlInvalid;
	public readonly entryTypes: Entry['type'][] = ['password', 'card'];

	private readonly destroyRef = inject(DestroyRef);
	private readonly configService = inject(ConfigService);
	private readonly modalRef = inject(ModalRef);
	private readonly entryManager = inject(EntryManager);
	private readonly groupManager = inject(GroupManager);
	private readonly notificationService = inject(NotificationService);
	private readonly fb = inject(FormBuilder);

	private readonly entryTypeHandlers: EntryTypeHandler = new Map<
		Entry['type'],
		{
			componentType: Type<any>;
			comparer: IEntryTypeComparer<Entry, EntryForm['value'], EntryDialogDataPayload>;
			mapper: IEntryTypeMapper<EntryForm['value'], Entry>;
		}
	>([
		[
			'password',
			{
				componentType: PasswordEntryPartialFormComponent,
				comparer: inject(PasswordEntryTypeComparer),
				mapper: inject(PasswordEntryMapper),
			},
		],
	]);
	private entryTypeHandler = this.entryTypeHandlers.get('password');

	private readonly _newEntryForm: EntryForm = this.fb.group({
		id: [null],
		groupId: [null],
		type: [
			{
				value: 'password' as Entry['type'],
				disabled: Boolean(this.entryManager.editedEntry) || this.isReadOnly,
			},
		],
		title: ['', Validators.required],
		creationDate: [null as number | Date],
		password: this.fb.group({
			username: [''],
			passwords: this.fb.group(
				{
					password: ['', Validators.required],
					repeatPassword: [''],
				},
				{ validators: [valueMatchValidator('password', 'repeatPassword')] },
			),
			url: [''],
			notes: [''],
			autotypeExp: [''],
			icon: [''],
		}),
		card: this.fb.group({
			cardholderName: [''],
			number: [''],
			expirationMonth: [0],
			expirationYear: [0],
			securityCode: [''],
			notes: [''],
		}),
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
				: this.groupManager.groups.find((g) => g.id === GroupId.Root).name;
	}

	get title() {
		return this.newEntryForm.controls.title;
	}

	ngOnInit() {
		if (this.additionalData.payload?.config?.readonly) {
			this.isReadOnly = true;
		}

		this.config = this.configService.config;
		this.prefillForm();

		this.newEntryForm.controls.type.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((type) => {
				this.entryTypeHandler = this.entryTypeHandlers.get(type);
				this.formPartialComponent = this.entryTypeHandler.componentType;

				this.newEntryForm.controls.card.reset(null, { emitEvent: false });
				this.newEntryForm.controls.password.reset(null, { emitEvent: false });
			});
	}

	ngAfterViewInit() {
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
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event: FocusEvent) => {
				const parentTop = (
					this.entryForm.nativeElement as HTMLElement
				).getBoundingClientRect().top;
				const childTop = (event.target as HTMLElement).getBoundingClientRect()
					.top;

				const y = childTop - parentTop;
				this.entryForm.nativeElement.scrollTo({ top: y - 20 });
			});
	}

	ngOnDestroy(): void {
		this.newEntryForm.reset(null, { emitEvent: false });
	}

	async restore() {
		await this.entryManager.saveEntry({
			...this.entryManager.editedEntry,
			icon: null,
		} as PasswordEntry);
		this.notificationService.add({
			message: 'Entry restored',
			type: 'success',
			alive: 10 * 1000,
		});
		this.close();
	}

	async delete() {
		const historyEntry = this.additionalData.payload
			.historyEntry as HistoryEntry;
		await this.entryManager.deleteEntryHistory(
			historyEntry.id,
			historyEntry.entry,
		);
		this.notificationService.add({
			message: 'History entry removed',
			type: 'success',
			alive: 10 * 1000,
		});
		this.close();
	}

	async addNewEntry() {
		if (!this.groupManager.selectedGroup) {
			throw new Error('No category has been selected!');
		}

		markAllAsDirty(this.newEntryForm);

		if (this.newEntryForm.invalid) {
			const el = (this.entryForm.nativeElement as HTMLElement).querySelector(
				'input.ng-invalid, .form-group.ng-invalid',
			);
			const elToScroll =
				el.tagName.toLowerCase() === 'div' ? el : el.parentElement;
			elToScroll.scrollIntoView({ block: 'start', inline: 'nearest' });

			return;
		}

		this.saveLocked = true;

		if (
			this.entryManager.editedEntry?.id &&
			(await this.entryTypeHandler.comparer.compare(
				this.entryManager.editedEntry,
				this.newEntryForm.value,
				this.additionalData.payload,
			))
		) {
			this.close();

			return;
		}

		const entry = await this.entryTypeHandler.mapper.map(
			this.newEntryForm.value,
		);

		await this.entryManager.saveEntry(entry);

		this.saveLocked = false;
		this.close();
	}

	async close() {
		this.modalRef.close();
	}

	closeReadOnly() {
		this.modalRef.close();
	}

	private async prefillForm() {
		if (this.entryManager.editedEntry) {
			this.fillExistingEntry();
		} else {
			this.fillNewEntry();
		}
	}

	private fillExistingEntry() {
		this.newEntryForm.patchValue({
			id: this.entryManager.editedEntry.id,
			groupId: this.entryManager.editedEntry.groupId,
			creationDate: this.entryManager.editedEntry.creationDate,
			title: this.entryManager.editedEntry.title,
			type: this.entryManager.editedEntry.type,
		});
	}

	private fillNewEntry() {
		this.newEntryForm.patchValue({ groupId: this.groupManager.selectedGroup });
	}
}
