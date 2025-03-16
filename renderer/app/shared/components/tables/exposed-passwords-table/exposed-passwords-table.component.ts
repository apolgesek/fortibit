import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FeatherModule } from 'angular-feather';

@Component({
	selector: 'app-exposed-passwords-table',
	standalone: true,
	imports: [CommonModule, FeatherModule],
	templateUrl: './exposed-passwords-table.component.html',
	styleUrl: './exposed-passwords-table.component.scss',
})
export class ExposedPasswordsTableComponent {
	@Input() entries: any[] = [];
	@Output() activated = new EventEmitter<number>();

	editEntry(id: number) {
		this.activated.emit(id);
	}
}
