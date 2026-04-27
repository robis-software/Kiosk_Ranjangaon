import { LocationComponent } from './Sections/configuration/Routes/location/location.component';
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
    path: 'options',
    title: 'Options | KIOSK',
    loadComponent: async() => await import("./Sections/more-options/more-options.component").then(c => c.MoreOptionsComponent)
  },
  {
    path: 'authenicate',
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
    path: 'configuration',
    title: 'Configuration | KIOSK',
    loadComponent: async() => await import("./Sections/configuration/configuration.component").then(c => c.ConfigurationComponent),
    children: [
        {
            path: '',
            title: 'Configuration | KIOSK',
            loadComponent: async() => await import("./Sections/configuration/Routes/general/general.component").then(c => c.GeneralComponent)
        },
        {
            path: 'location',
            title: 'Configuration | KIOSK',
            loadComponent: async() => await import("./Sections/configuration/Routes/location/location.component").then(c => c.LocationComponent)
        }
    ]
  },
  {
    path: 'disconnected',
    title: 'Disconnected | KIOSK',
    loadComponent: async() => await import("./Sections/disconnected/disconnected.component").then(c => c.DisconnectedComponent)
  }
];
