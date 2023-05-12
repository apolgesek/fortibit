import { Routes } from '@angular/router';
import { WorkspaceGuard } from './core/guards/workspace.guard';
import { EntrySelectComponent } from './main/components/entry-select/entry-select.component';
import { MasterPasswordSetupComponent } from './main/components/master-password-setup/master-password-setup.component';
import { MasterPasswordComponent } from './main/components/master-password/master-password.component';
import { WorkspaceComponent } from './main/components/workspace/workspace.component';
import { MainComponent } from './main/main.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    redirectTo: 'master-password'
  },
  {
    path: 'entry-select',
    pathMatch: 'full',
    component: EntrySelectComponent,
    canDeactivate: [false]
  },
  {
    path: '',
    component: MainComponent,
    children: [
      {
        path: 'pass',
        component: MasterPasswordComponent,
        data: { state: "MasterPasswordComponent" }
      },
      {
        path: 'workspace',
        component: WorkspaceComponent,
        data: { state: "WorkspaceComponent" },
      },
      {
        path: 'master-password',
        component: MasterPasswordSetupComponent,
        canActivate: [WorkspaceGuard],
        data: { state: "MasterPasswordSetupComponent" }
      },
    ]
  }
];
