import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkspaceComponent } from './components/workspace/workspace.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { WorkspaceGuard } from '../core/guards/workspace.guard';

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
    canActivate: [WorkspaceGuard]
  }
];

@NgModule({
  declarations: [],
  providers: [WorkspaceGuard],
  imports: [ CommonModule, RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MainRoutingModule {}
