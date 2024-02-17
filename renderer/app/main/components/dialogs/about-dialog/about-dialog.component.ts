import { CommonModule } from '@angular/common';
import { Component, ComponentRef, OnInit, inject } from '@angular/core';
import { ModalRef, UpdateService, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { Configuration } from '@config/configuration';
import { IpcChannel, UpdateState } from '@shared-renderer/index';
import { FeatherModule } from 'angular-feather';
import { MessageBroker } from 'injection-tokens';
import { take } from 'rxjs';

@Component({
	selector: 'app-about-dialog',
	templateUrl: './about-dialog.component.html',
	styleUrls: ['./about-dialog.component.scss'],
	standalone: true,
	imports: [ModalComponent, CommonModule, FeatherModule],
})
export class AboutDialogComponent implements IModal, OnInit {
	public readonly ref!: ComponentRef<AboutDialogComponent>;
	public readonly additionalData!: IAdditionalData;
	public readonly updateState = UpdateState;
	public config: Configuration;

	private readonly configService = inject(ConfigService);
	private readonly modalRef = inject(ModalRef);
	private readonly workspaceService = inject(WorkspaceService);
	private readonly messageBroker = inject(MessageBroker);
	private readonly updateService = inject(UpdateService);

	get state(): UpdateState {
		return this.updateService.state;
	}

	get progress(): string {
		return this.updateService.progress;
	}

	get version(): string {
		return this.updateService.version;
	}

	ngOnInit() {
		this.configService.configLoadedSource$.pipe(take(1)).subscribe((config) => {
			this.config = config as Configuration;
		});
	}

	async updateAndRelaunch() {
		const success = await this.workspaceService.executeEvent();
		if (success) {
			this.messageBroker.ipcRenderer.send(IpcChannel.UpdateAndRelaunch);
		}
	}

	close() {
		this.modalRef.close();
	}
}
