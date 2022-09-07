import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { DashboardGuard } from '../core/guards/dashboard.guard';

const routes: Routes = [
  {
    path: 'pass',
    component: MasterPasswordComponent,
    data: { animation: 'masterPasswordPage' }
  },
  {
    path: 'workspace',
    component: WorkspaceComponent,
    data: { animation:  'workspacePage' },
    canActivate: [DashboardGuard]
  }
];

@NgModule({
  declarations: [],
  providers: [DashboardGuard],
  imports: [ CommonModule, RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MainRoutingModule {}
