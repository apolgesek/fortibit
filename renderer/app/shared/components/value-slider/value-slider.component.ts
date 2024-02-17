import { CommonModule } from '@angular/common';
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	DestroyRef,
	ElementRef,
	Input,
	ViewChild,
	inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent } from 'rxjs';

@Component({
	selector: 'app-value-slider',
	templateUrl: './value-slider.component.html',
	styleUrls: ['./value-slider.component.scss'],
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: ValueSliderComponent,
			multi: true,
		},
	],
})
export class ValueSliderComponent
	implements AfterViewInit, ControlValueAccessor
{
	@Input() labelId = '';
	@ViewChild('sliderHandle') public readonly sliderHandle: ElementRef;
	@ViewChild('sliderFill') public readonly sliderFill: ElementRef;
	@ViewChild('sliderBar') public readonly sliderBar: ElementRef;

	public value = 0;
	public readonly minValue = 5;
	public readonly maxValue = 128;

	private readonly destroyRef = inject(DestroyRef);
	private readonly cdRef = inject(ChangeDetectorRef);

	private onChange: (value: number) => void;
	private isDragging = false;
	private startXLeftOffset = 0;
	private startClientX = 0;

	ngAfterViewInit() {
		const barWidth = (
			this.sliderBar.nativeElement as HTMLElement
		).getBoundingClientRect().width;
		const handleWidth = (
			this.sliderHandle.nativeElement as HTMLElement
		).getBoundingClientRect().width;

		const pos =
			Math.floor(
				(this.value / (this.maxValue - this.minValue)) *
					(barWidth - handleWidth),
			) - this.minValue;
		(this.sliderHandle.nativeElement as HTMLElement).style.transform =
			`translateX(${pos}px)`;
		(this.sliderFill.nativeElement as HTMLElement).style.width =
			pos + handleWidth / 2 + 'px';

		fromEvent(this.sliderHandle.nativeElement, 'mousedown')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event: MouseEvent) => {
				this.isDragging = true;
				const parentPos = (
					event.target as HTMLElement
				).parentElement.getBoundingClientRect();
				const pos = (event.target as HTMLElement).getBoundingClientRect();

				this.startXLeftOffset = pos.left - parentPos.left;
				this.startClientX = event.clientX;
			});

		fromEvent(window, 'mouseup')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (this.isDragging) {
					this.isDragging = false;
				}
			});

		fromEvent(window, 'mousemove')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event: MouseEvent) => {
				if (!this.isDragging) {
					return;
				}

				let newPos = 0;
				if (event.clientX > this.startClientX) {
					newPos = Math.min(
						this.startXLeftOffset + (event.clientX - this.startClientX),
						barWidth - handleWidth,
					);
				} else {
					newPos = Math.max(
						this.startXLeftOffset - (this.startClientX - event.clientX),
						0,
					);
				}

				(this.sliderHandle.nativeElement as HTMLElement).style.transform =
					`translateX(${newPos}px)`;
				(this.sliderFill.nativeElement as HTMLElement).style.width =
					newPos + handleWidth / 2 + 'px';

				this.value =
					Math.floor(
						(newPos / (barWidth - handleWidth)) *
							(this.maxValue - this.minValue),
					) + this.minValue;

				this.onChange(this.value);
				this.cdRef.detectChanges();
			});

		fromEvent(this.sliderHandle.nativeElement, 'click')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event: MouseEvent) => {
				event.stopPropagation();
			});

		fromEvent(this.sliderBar.nativeElement, 'click')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event: MouseEvent) => {
				let newPos = event.offsetX - handleWidth / 2;
				if (event.offsetX <= handleWidth / 2) {
					newPos = 0;
				} else if (event.offsetX >= barWidth - handleWidth) {
					newPos = barWidth - handleWidth;
				}

				(this.sliderHandle.nativeElement as HTMLElement).style.transform =
					`translateX(${newPos}px)`;
				(this.sliderFill.nativeElement as HTMLElement).style.width =
					newPos + handleWidth / 2 + 'px';
				this.value =
					Math.floor(
						(Math.min(
							Math.max(event.offsetX - handleWidth / 2, 0),
							barWidth - handleWidth,
						) /
							(barWidth - handleWidth)) *
							(this.maxValue - this.minValue),
					) + this.minValue;

				this.onChange(this.value);
				this.cdRef.detectChanges();
			});

		fromEvent(window, 'keydown')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event: KeyboardEvent) => {
				if (
					!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
						event.key,
					)
				) {
					return;
				}

				const barOffsetLeft = (
					this.sliderBar.nativeElement as HTMLElement
				).getBoundingClientRect().left;
				const handleOffsetLeft = (
					this.sliderHandle.nativeElement as HTMLElement
				).getBoundingClientRect().left;
				const offset = handleOffsetLeft - barOffsetLeft;

				let newPos = 0;
				if (['ArrowLeft', 'ArrowDown'].includes(event.key)) {
					if (offset <= 0) {
						return;
					}

					newPos = offset - 1;
				} else if (['ArrowRight', 'ArrowUp'].includes(event.key)) {
					if (offset >= barWidth - handleWidth) {
						return;
					}

					newPos = offset + 1;
				}

				(this.sliderHandle.nativeElement as HTMLElement).style.transform =
					`translateX(${newPos}px)`;
				(this.sliderFill.nativeElement as HTMLElement).style.width =
					newPos + handleWidth / 2 + 'px';
				this.value =
					Math.floor(
						(newPos / (barWidth - handleWidth)) *
							(this.maxValue - this.minValue),
					) + this.minValue;

				this.onChange(this.value);
				this.cdRef.detectChanges();
			});
	}

	writeValue(value: number): void {
		this.value = value >= this.minValue ? value : this.minValue;
	}

	registerOnChange(fn: any): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: any): void {}
}
