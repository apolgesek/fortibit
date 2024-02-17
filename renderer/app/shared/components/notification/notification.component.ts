import {
	AfterViewInit,
	Component,
	ComponentRef,
	ElementRef,
	HostBinding,
	HostListener,
	OnDestroy,
	OnInit,
} from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';
import { Toast } from '@app/core/models';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';

@Component({
	selector: 'app-notification',
	templateUrl: './notification.component.html',
	styleUrls: ['./notification.component.scss'],
	standalone: true,
	imports: [CommonModule, FeatherModule],
})
export class NotificationComponent implements OnInit, AfterViewInit, OnDestroy {
	@HostBinding('attr.role') public readonly role = 'alert';
	@HostBinding('attr.aria-live') public readonly ariaLive = 'off';

	public model!: Toast;
	public componentRef!: ComponentRef<NotificationComponent>;
	public timeLeft = 0;
	private timer: any;

	constructor(
		private readonly element: ElementRef,
		private readonly notificationService: NotificationService,
	) {}

	@HostBinding('style')
	get style(): string {
		return this.model.style ?? '';
	}

	@HostBinding('class')
	get class(): string {
		return this.model.class ?? '';
	}

	@HostBinding('class.success')
	get successClass(): boolean {
		return this.model.type === 'success';
	}

	@HostBinding('class.error')
	get errorClass(): boolean {
		return this.model.type === 'error';
	}

	@HostListener('click')
	onClick() {
		this.notificationService.remove(this.componentRef);
	}

	ngOnInit() {
		if (this.model.alive) {
			this.timeLeft = this.model.alive / 1000;

			this.timer = setInterval(() => {
				this.timeLeft--;

				if (this.timeLeft <= 0) {
					this.notificationService.remove(this.componentRef);
					clearInterval(this.timer);
				}
			}, 1000);
		}
	}

	ngAfterViewInit() {
		const rootElement = this.element.nativeElement as HTMLElement;
		rootElement.setAttribute('data-prevent-entry-deselect', '');
	}

	ngOnDestroy() {
		clearInterval(this.timer);
	}
}
