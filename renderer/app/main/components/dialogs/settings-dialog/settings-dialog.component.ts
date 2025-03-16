/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef, inject, Input } from '@angular/core';
import { ConfigService, ModalRef } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { TabComponent } from '@app/shared/components/tab/tab.component';
import { TabsetComponent } from '@app/shared/components/tabset/tabset.component';
import { MessageBroker } from 'injection-tokens';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EncryptionTabComponent } from './encryption-tab/encryption-tab.component';
import { GeneralTabComponent } from './general-tab/general-tab.component';
import { IntegrationTabComponent } from './integration-tab/integration-tab.component';
import { OrganizationTabComponent } from './organization-tab/organization-tab.component';
import { ViewTabComponent } from './view-tab/view-tab.component';

enum Tab {
	Integration = 'Integration',
	Organization = 'Organization',
}

@Component({
	selector: 'app-settings-dialog',
	templateUrl: './settings-dialog.component.html',
	styleUrls: ['./settings-dialog.component.scss'],
	standalone: true,
	imports: [
		TabsetComponent,
		TabComponent,
		ModalComponent,
		EncryptionTabComponent,
		ViewTabComponent,
		IntegrationTabComponent,
		GeneralTabComponent,
		OrganizationTabComponent,
	],
})
export class SettingsDialogComponent implements IModal {
	@Input() public readonly additionalData!: IAdditionalData;

	public readonly ref!: ComponentRef<SettingsDialogComponent>;
	public readonly tab = Tab;

	private readonly modalRef = inject(ModalRef);
	private readonly messageBroker = inject(MessageBroker);
	private readonly configService = inject(ConfigService);

	close() {
		this.modalRef.close();
	}

	shouldIncludeTab(tab: Tab): boolean {
		switch (this.messageBroker.platform) {
			case 'darwin':
				const disabledTabs = [Tab.Organization];
				if (disabledTabs.includes(tab)) {
					return false;
				}
			case 'win32':
				if (tab === Tab.Organization) {
					return Boolean(this.configService.config.organizationName);
				}
			default:
				return true;
		}
	}
}
