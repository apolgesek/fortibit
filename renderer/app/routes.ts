import { Routes } from '@angular/router';
import { WorkspaceGuard } from './core/guards/workspace.guard';
import { EntrySelectComponent } from './main/components/entry-select/entry-select.component';
import { MasterPasswordComponent } from './main/components/master-password/master-password.component';
import { WorkspaceComponent } from './main/components/workspace/workspace.component';
import { MainComponent } from './main/main.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    redirectTo: 'workspace'
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
        data: { animation: 'masterPasswordPage' }
      },
      {
        path: 'workspace',
        component: WorkspaceComponent,
        data: { animation:  'workspacePage' },
        canActivate: [WorkspaceGuard]
      },
    ]
  }
];
