import { CommonModule } from '@angular/common';
import { Component, ComponentRef, inject } from '@angular/core';
import {
	AbstractControl,
	FormBuilder,
	FormControl,
	FormGroup,
	ReactiveFormsModule,
} from '@angular/forms';
import { GroupId } from '@app/core/enums';
import {
	EntryManager,
	GroupManager,
	ModalRef,
	NotificationService,
} from '@app/core/services';
import { HistoryManager } from '@app/core/services/managers/history.manager';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { isControlInvalid } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import {
	Observable,
	combineLatest,
	forkJoin,
	from,
	switchMap,
	take,
	tap,
	timer,
} from 'rxjs';

type ToggleableControls<K> = { [key in keyof K]: AbstractControl<any> } & {
	enabled: FormControl<boolean>;
};
type ToggleableGroup<T extends ToggleableControls<T>> = FormGroup<T>;

@Component({
	selector: 'app-maintenance-dialog',
	standalone: true,
	templateUrl: './maintenance-dialog.component.html',
	styleUrls: ['./maintenance-dialog.component.scss'],
	imports: [ModalComponent, CommonModule, ReactiveFormsModule, FeatherModule],
})
export class MaintenanceDialogComponent implements IModal {
	public readonly isControlInvalid = isControlInvalid;
	public cleaningInProgress = false;

	ref: ComponentRef<unknown>;
	additionalData?: IAdditionalData;
	showBackdrop?: boolean;

	private readonly modalRef = inject(ModalRef);
	private readonly formBuilder = inject(FormBuilder);
	private readonly groupManager = inject(GroupManager);
	private readonly historyManager = inject(HistoryManager);
	private readonly entryManager = inject(EntryManager);
	private readonly notificationService = inject(NotificationService);

	private readonly _maintenanceForm = this.formBuilder.group({
		historyDays: this.formBuilder.group({
			enabled: true,
			value: 30,
		}),
		emptyRecycleBin: this.formBuilder.group({
			enabled: true,
		}),
	});

	get maintenanceForm() {
		return this._maintenanceForm;
	}

	async delete() {
		Object.values(this.maintenanceForm.controls).forEach((control) => {
			control.markAsDirty();
		});

		if (this.maintenanceForm.invalid) {
			return;
		}

		this.cleaningInProgress = true;

		const observables: Observable<any>[] = [];

		if (this.isEnabled(this.maintenanceForm.controls.historyDays)) {
			observables.push(
				from(
					this.historyManager.deleteOlderThanDays(
						this.maintenanceForm.controls.historyDays.controls.value.value,
					),
				),
			);
		}

		if (this.isEnabled(this.maintenanceForm.controls.emptyRecycleBin)) {
			observables.push(
				from(this.entryManager.getAllByGroup(GroupId.RecycleBin)).pipe(
					switchMap((entries) => {
						return this.entryManager.bulkDelete(entries.map((e) => e.id));
					}),
					tap(async () => {
						if (this.groupManager.selectedGroup === GroupId.RecycleBin) {
							await this.entryManager.setByGroup(GroupId.RecycleBin);
							this.entryManager.updateEntriesSource();
						}
					}),
				),
			);
		}

		forkJoin([...observables, timer(1000)]).subscribe(() => {
			this.notificationService.add({
				message: 'Maintenance completed',
				type: 'success',
				alive: 10 * 1000,
			});
			this.cleaningInProgress = false;
		});
	}

	close() {
		this.modalRef.close();
	}

	onNumberChange(event: Event, controlName: string, maxLength: number) {
		const input = event.target as HTMLInputElement;
		const value = input.value.toString();

		if (value.length >= maxLength) {
			input.valueAsNumber = parseInt(value.slice(0, maxLength), 10);
			this.maintenanceForm.get(controlName).setValue(input.value);
		}
	}

	onKeyDown(event: KeyboardEvent) {
		if (/^[-e\.+\s]$/.test(event.key)) event.preventDefault();
	}

	private isEnabled<T extends ToggleableControls<T>>(
		group: ToggleableGroup<T>,
	): boolean {
		return group.controls.enabled.value;
	}
}
