import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '@app/core/services';
import { NumberInputComponent } from '@app/shared/components/config-controls/number-input/number-input.component';
import { ToggleInputComponent } from '@app/shared/components/config-controls/toggle-input/toggle-input.component';
import { isControlInvalid } from '@app/utils';

@Component({
	selector: 'app-encryption-tab',
	templateUrl: './encryption-tab.component.html',
	styleUrls: ['./encryption-tab.component.scss'],
	standalone: true,
	imports: [ReactiveFormsModule, NumberInputComponent, ToggleInputComponent],
})
export class EncryptionTabComponent implements OnInit {
	public readonly isControlInvalid = isControlInvalid;
	private readonly configService = inject(ConfigService);
	private readonly formBuilder = inject(FormBuilder);
	private readonly destroyRef = inject(DestroyRef);

	private readonly _encryptionForm = this.formBuilder.group({
		passwordLength: this.formBuilder.control(null, [
			Validators.required,
			Validators.min(6),
			Validators.max(32),
		]),
		lowercase: this.formBuilder.control(false),
		uppercase: this.formBuilder.control(false),
		specialChars: this.formBuilder.control(false),
		numbers: this.formBuilder.control(false),
	});

	get encryptionForm() {
		return this._encryptionForm;
	}

	ngOnInit(): void {
		this._encryptionForm.setValue({
			passwordLength: this.configService.config.encryption.passwordLength,
			lowercase: this.configService.config.encryption.lowercase,
			numbers: this.configService.config.encryption.numbers,
			specialChars: this.configService.config.encryption.specialChars,
			uppercase: this.configService.config.encryption.uppercase,
		});

		this.encryptionForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (this.encryptionForm.invalid) {
					return;
				}

				this.configService.setConfig({
					encryption: this.encryptionForm.getRawValue(),
				});
			});
	}
}
