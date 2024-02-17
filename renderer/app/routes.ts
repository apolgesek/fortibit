import { Routes } from '@angular/router';
import { masterPasswordSetupResolver } from './core/resolvers';
import { EntrySelectComponent } from './main/components/entry-select/entry-select.component';
import { MasterPasswordSetupComponent } from './main/components/master-password-setup/master-password-setup.component';
import { MasterPasswordComponent } from './main/components/master-password/master-password.component';
import { WorkspaceComponent } from './main/components/workspace/workspace.component';
import { MainComponent } from './main/main.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'prefix',
		redirectTo: 'home',
	},
	{
		path: 'entry-select',
		pathMatch: 'full',
		component: EntrySelectComponent,
		canDeactivate: [() => false],
	},
	{
		path: '',
		component: MainComponent,
		canActivate: [masterPasswordSetupResolver()],
		children: [
			{
				path: 'home',
				component: MasterPasswordComponent,
				data: { state: 'MasterPasswordComponent' },
			},
			{
				path: 'workspace',
				component: WorkspaceComponent,
				data: { state: 'WorkspaceComponent' },
			},
			{
				path: 'create-new',
				component: MasterPasswordSetupComponent,
				data: { state: 'MasterPasswordSetupComponent' },
			},
		],
	},
];
