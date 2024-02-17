import { CommonModule } from '@angular/common';
import { Component, ComponentRef, inject } from '@angular/core';
import { ConfigService, ModalRef } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
	selector: 'app-confirm-url-dialog',
	templateUrl: './confirm-url-dialog.component.html',
	styleUrls: ['./confirm-url-dialog.component.scss'],
	standalone: true,
	imports: [CommonModule, ModalComponent],
})
export class ConfirmUrlDialogComponent implements IModal {
	public readonly ref!: ComponentRef<ConfirmUrlDialogComponent>;
	public readonly additionalData!: IAdditionalData;

	private readonly modalRef = inject(ModalRef);
	private readonly configService = inject(ConfigService);

	confirm() {
		this.modalRef.onActionResult.next(true);
		this.modalRef.onActionResult.complete();

		this.modalRef.close();
	}

	close() {
		this.modalRef.onActionResult.next(false);
		this.modalRef.onActionResult.complete();

		this.modalRef.close();
	}

	disableDialog(event: Event) {
		this.configService.setConfig({
			showInsecureUrlPrompt: !(event.target as HTMLInputElement).checked,
		});
	}
}
