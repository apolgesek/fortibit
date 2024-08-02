import {
	Component,
	OnInit,
	ViewContainerRef,
	inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageBroker } from 'injection-tokens';
import { IpcChannel } from '../../../shared/ipc-channel.enum';
import { AppViewContainer } from '../core/services';
import { MenuBarComponent } from '../main/components/menu-bar/menu-bar.component';

const ONE_HOUR = 1000 * 60 * 60;

@Component({
	selector: 'app-main',
	templateUrl: './main.component.html',
	standalone: true,
	imports: [RouterModule, MenuBarComponent],
})
export class MainComponent implements OnInit {
	public isElectron = false;
	public isDatabaseLoaded: boolean;

	private readonly messageBroker = inject(MessageBroker);
	private readonly appViewContainer = inject(AppViewContainer);
	private readonly viewContainerRef = inject(ViewContainerRef);

	constructor() {
		this.isElectron = this.messageBroker.platform !== 'web';
		this.appViewContainer.appViewContainerRef = this.viewContainerRef;
	}

	ngOnInit() {
		this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);

		setInterval(() => {
			this.messageBroker.ipcRenderer.send(IpcChannel.CheckUpdate);
		}, ONE_HOUR);
	}
}
