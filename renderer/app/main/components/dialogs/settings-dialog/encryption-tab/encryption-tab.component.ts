import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '@app/core/services';
import { isControlInvalid } from '@app/utils';
import { Product } from '@config/product';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ValidationErrorComponent } from '../../../../../shared/components/validation-error/validation-error.component';

@Component({
	selector: 'app-encryption-tab',
	templateUrl: './encryption-tab.component.html',
	styleUrls: ['./encryption-tab.component.scss'],
	standalone: true,
	imports: [ReactiveFormsModule, ValidationErrorComponent],
})
export class EncryptionTabComponent implements OnInit {
	public readonly isControlInvalid = isControlInvalid;
	private readonly debounceTimeMs = 500;

	private readonly configService = inject(ConfigService);
	private readonly formBuilder = inject(FormBuilder);
	private readonly destroyRef = inject(DestroyRef);

	private readonly _encryptionForm = this.formBuilder.group({
		passwordLength: [
			0,
			{
				validators: [
					Validators.required,
					Validators.min(6),
					Validators.max(32),
				],
			},
		],
		lowercase: [false],
		uppercase: [false],
		specialChars: [false],
		numbers: [false],
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
			.pipe(
				debounceTime(this.debounceTimeMs),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((form) => {
				if (this.encryptionForm.invalid) {
					return;
				}

				const configPartial = {
					encryption: {
						passwordLength: form.passwordLength,
						lowercase: form.lowercase,
						uppercase: form.uppercase,
						specialChars: form.specialChars,
						numbers: form.numbers,
					},
				} as Partial<Product>;

				this.configService.setConfig(configPartial);
			});
	}

	onNumberChange(event: Event, path: string, maxLength: number) {
		const input = event.target as HTMLInputElement;
		const value = input.value.toString();

		if (value.length >= maxLength) {
			input.valueAsNumber = parseInt(value.slice(0, maxLength), 10);
			this.encryptionForm.get(path).setValue(input.value);
		}
	}
}
