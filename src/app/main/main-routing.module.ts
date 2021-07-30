import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MasterPasswordComponent } from './components/master-password/master-password.component';
import { InitialRouteGuard } from '../core/guards/initial-route.guard';

const routes: Routes = [
  {
    path: 'home',
    component: MasterPasswordComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [InitialRouteGuard]
  }
];

@NgModule({
  declarations: [],
  providers: [InitialRouteGuard],
  imports: [ CommonModule, RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MainRoutingModule {}
