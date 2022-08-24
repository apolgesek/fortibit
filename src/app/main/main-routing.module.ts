import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { DashboardGuard } from '../core/guards/dashboard.guard';

const routes: Routes = [
  {
    path: 'pass',
    component: MasterPasswordComponent,
    data: { animation: 'masterPasswordPage' }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { animation:  'dashboardPage' },
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
