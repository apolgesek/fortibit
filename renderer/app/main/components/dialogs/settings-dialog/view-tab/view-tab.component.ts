import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ConfigService } from '@app/core/services';
import { ToggleInputComponent } from '@app/shared/components/config-controls/toggle-input/toggle-input.component';
import { Product } from '@config/product';
import { FeatherModule } from 'angular-feather';

@Component({
	selector: 'app-view-tab',
	templateUrl: './view-tab.component.html',
	styleUrls: ['./view-tab.component.scss'],
	standalone: true,
	imports: [ReactiveFormsModule, FeatherModule, ToggleInputComponent],
})
export class ViewTabComponent implements OnInit {
	private readonly formBuilder = inject(FormBuilder);
	private readonly destroyRef = inject(DestroyRef);
	private readonly configService = inject(ConfigService);

	private readonly _viewForm = this.formBuilder.group({
		darkTheme: this.formBuilder.control(false),
		displayIcons: this.formBuilder.control(false),
	});

	get viewForm() {
		return this._viewForm;
	}

	ngOnInit(): void {
		this.viewForm.setValue({
			darkTheme: this.configService.config.theme === 'dark',
			displayIcons: this.configService.config.displayIcons,
		});

		this.viewForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((form) => {
				const configPartial = {
					displayIcons: form.displayIcons,
					theme: form.darkTheme ? 'dark' : 'light',
				} as Partial<Product>;

				this.configService.setConfig(configPartial);
			});
	}
}
