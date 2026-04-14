import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard | KIOSK',
    loadComponent: async() => await import("./Sections/dashboard-state-mission/dashboard.component").then(c => c.DashboardComponent)
  },
  {
    path: 'rack-select',
    title: 'Dashboard | KIOSK',
    loadComponent: async() => await import("./Sections/rack-select/rack-select.component").then(c => c.RackSelectComponent)
  },
  {
    path: 'logs',
    title: 'Authenicate | KIOSK',
    loadComponent: async() => await import("./Sections/logs-password/logs-password.component").then(c => c.LogsPasswordComponent)
  },
  {
    path: 'logs/list',
    title: 'Logs | KIOSK',
    loadComponent: async() => await import("./Sections/logs/logs.component").then(c => c.LogsComponent)
  },
  {
    path: 'logs/view/:id',
    title: 'Logs | KIOSK',
    loadComponent: async() => await import("./Sections/logs-view/logs-view.component").then(c => c.LogsViewComponent)
  },
  {
    path: 'disconnected',
    title: 'Disconnected | KIOSK',
    loadComponent: async() => await import("./Sections/disconnected/disconnected.component").then(c => c.DisconnectedComponent)
  }
];
