import { Pipe, PipeTransform } from '@angular/core';

type Unit = 'hour' | 'day' | 'month' | 'year';

@Pipe({
	name: 'timeRemaining',
	standalone: true,
})
export class TimeRemainingPipe implements PipeTransform {
	pluralMapping = new Map<Unit, Record<'0' | '1' | '2' | 'other', string>>([
		['hour', { 0: 'hours', 1: 'hour', 2: 'hours', other: 'hours' }],
		['day', { 0: 'days', 1: 'day', 2: 'days', other: 'days' }],
		['month', { 0: 'months', 1: 'month', 2: 'months', other: 'months' }],
		['year', { 0: 'years', 1: 'year', 2: 'years', other: 'years' }],
	]);

	transform(value: Date, type: Unit): string {
		const msRemaining = value.getTime() - new Date().getTime();
		switch (type) {
			case 'hour':
				return this.getHours(msRemaining);
			case 'day':
				return this.getDays(msRemaining);
			case 'month':
				return this.getMonths(msRemaining);
			case 'year':
				return this.getYears(msRemaining);
		}
	}

	private getHours(msRemaining: number): string {
		const count = Math.ceil(msRemaining / (1000 * 60 * 60));
		return `in ${count} ${this.getUnit(count, 'hour')}`;
	}

	private getDays(msRemaining: number): string {
		const count = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

		if (count === 1) {
			return 'tomorrow';
		}

		return `in ${count} ${this.getUnit(count, 'day')}`;
	}

	private getMonths(msRemaining: number): string {
		const count = Math.ceil(msRemaining / (1000 * 60 * 60 * 24 * 30));
		return `in ${count} ${this.getUnit(count, 'month')}`;
	}

	private getYears(msRemaining: number): string {
		const count = Math.ceil(msRemaining / (1000 * 60 * 60 * 24 * 30 * 12));
		return `in ${count} ${this.getUnit(count, 'year')}`;
	}

	private getUnit(count: number, type: Unit): string {
		const units = this.pluralMapping.get(type);

		switch (count) {
			case 0:
				return units[0];
			case 1:
				return units[1];
			case 2:
				return units[2];
			default:
				return units.other;
		}
	}
}
