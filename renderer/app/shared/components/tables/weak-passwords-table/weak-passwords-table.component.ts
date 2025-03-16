import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FeatherModule } from 'angular-feather';

@Component({
	selector: 'app-weak-passwords-table',
	standalone: true,
	imports: [FeatherModule, CommonModule],
	templateUrl: './weak-passwords-table.component.html',
	styleUrl: './weak-passwords-table.component.scss',
})
export class WeakPasswordsTableComponent {
	@Input() entries: any[] = [];
	@Output() activated = new EventEmitter<number>();

	editEntry(id: number) {
		this.activated.emit(id);
	}
}
