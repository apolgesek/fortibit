import { Component, inject, OnInit } from '@angular/core';
import { ConfigService } from '@app/core/services';

@Component({
	selector: 'app-organization-tab',
	standalone: true,
	imports: [],
	templateUrl: './organization-tab.component.html',
	styleUrl: './organization-tab.component.scss',
})
export class OrganizationTabComponent implements OnInit {
	organizationName: string;
	private readonly config = inject(ConfigService);

	ngOnInit(): void {
		this.organizationName = this.config.config.organizationName;
	}
}
