import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MasterPasswordComponent } from './main/components/master-password/master-password.component';
import { WorkspaceComponent } from './main/components/workspace/workspace.component';
import { WorkspaceGuard } from './core/guards/workspace.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'workspace'
  },
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
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  providers: [WorkspaceGuard],
  exports: [RouterModule]
})
export class AppRoutingModule {}
