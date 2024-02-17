import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-password-strength-meter',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './password-strength-meter.component.html',
	styleUrls: ['./password-strength-meter.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordStrengthMeterComponent {
	@Input() score = 0;
}
