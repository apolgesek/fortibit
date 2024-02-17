import { CommonModule } from '@angular/common';
import { Component, ComponentRef, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ModalRef } from '@app/core/services';
import { HistoryManager } from '@app/core/services/managers/history.manager';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { isControlInvalid } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import { combineLatest, from, take, timer } from 'rxjs';

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
	public removedHistoryEntries: number;

	ref: ComponentRef<unknown>;
	additionalData?: IAdditionalData;
	showBackdrop?: boolean;

	private readonly modalRef = inject(ModalRef);
	private readonly formBuilder = inject(FormBuilder);
	private readonly historyManager = inject(HistoryManager);

	private readonly _maintenanceForm = this.formBuilder.group({
		historyDays: [30],
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

		combineLatest([
			from(
				this.historyManager.deleteOlderThanDays(
					this.maintenanceForm.controls.historyDays.value,
				),
			),
			timer(1000).pipe(take(1)),
		]).subscribe(([result]) => {
			this.removedHistoryEntries = result;
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
}
