import { CommonModule } from '@angular/common';
import {
	Component,
	ComponentRef,
	DestroyRef,
	OnInit,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ClipboardService, ModalRef } from '@app/core/services';
import { IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { ValueSliderComponent } from '@app/shared/components/value-slider/value-slider.component';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { PrettyPasswordPipe } from '@app/shared/pipes/pretty-password.pipe';
import { IpcChannel } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { debounceTime } from 'rxjs';

@Component({
	selector: 'app-generator-dialog',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		FeatherModule,
		ModalComponent,
		ValueSliderComponent,
		PrettyPasswordPipe,
		TooltipDirective,
	],
	templateUrl: './generator-dialog.component.html',
	styleUrls: ['./generator-dialog.component.scss'],
})
export class GeneratorDialogComponent implements IModal, OnInit {
	public ref: ComponentRef<unknown>;
	public password = 'Generating...';

	private readonly modalRef = inject(ModalRef);
	private readonly formBuilder = inject(FormBuilder);
	private readonly messageBroker = inject(MessageBroker);
	private readonly destroyRef = inject(DestroyRef);
	private readonly clipboardService = inject(ClipboardService);

	private readonly _settingsForm = this.formBuilder.group({
		passwordLength: [15],
		lowercase: [true],
		uppercase: [true],
		specialChars: [true],
		numbers: [true],
	});

	get settingsForm() {
		return this._settingsForm;
	}

	async ngOnInit() {
		this.generatePassword();

		this.settingsForm.valueChanges
			.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.generatePassword();
			});
	}

	close() {
		this.modalRef.close();
	}

	copy() {
		this.clipboardService.copyText({
			value: this.password,
			description: 'Password copied',
			clearTimeMs: 5000,
			showCount: false,
		});
	}

	async generatePassword(): Promise<void> {
		this.password = await this.messageBroker.ipcRenderer.invoke(
			IpcChannel.GeneratePassword,
			{
				length: this.settingsForm.value.passwordLength,
				lowercase: this.settingsForm.value.lowercase,
				uppercase: this.settingsForm.value.uppercase,
				symbols: this.settingsForm.value.specialChars,
				numbers: this.settingsForm.value.numbers,
				strict: false,
				excludeSimilarCharacters: true,
			},
		);
	}
}
