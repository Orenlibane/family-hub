import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, adultGuard, kidGuard } from './core/guards';
import { VotingComponent } from './pages/command-center/voting/voting.component';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'join/:inviteCode',
    loadComponent: () => import('./pages/join/join.component').then(m => m.JoinComponent)
  },
  {
    path: 'join',
    loadComponent: () => import('./pages/join/join.component').then(m => m.JoinComponent)
  },

  // Command Center - accessible to all authenticated users (Playground on hold)
  {
    path: 'command-center',
    loadComponent: () => import('./layouts/command-center-layout.component').then(m => m.CommandCenterLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/command-center/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/command-center/tasks/tasks.component').then(m => m.TasksComponent)
      },
      {
        path: 'rewards',
        loadComponent: () => import('./pages/command-center/rewards/rewards.component').then(m => m.RewardsComponent)
      },
      {
        path: 'family',
        loadComponent: () => import('./pages/command-center/family/family.component').then(m => m.FamilyComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('./pages/command-center/calendar/calendar.component').then(m => m.CalendarComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/command-center/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'voting',
        component: VotingComponent
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/command-center/chat/chat.component').then(m => m.ChatComponent)
      },
      {
        path: 'logistics',
        loadComponent: () => import('./pages/command-center/logistics/logistics.component').then(m => m.LogisticsComponent)
      }
    ]
  },

  // Kid routes (Playground) - with layout wrapper
  {
    path: 'playground',
    loadComponent: () => import('./layouts/playground-layout.component').then(m => m.PlaygroundLayoutComponent),
    canActivate: [authGuard, kidGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/playground/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/playground/my-tasks/my-tasks.component').then(m => m.MyTasksComponent)
      },
      {
        path: 'shop',
        loadComponent: () => import('./pages/playground/shop/shop.component').then(m => m.ShopComponent)
      },
      {
        path: 'avatar',
        loadComponent: () => import('./pages/playground/avatar/avatar.component').then(m => m.AvatarComponent)
      },
      {
        path: 'voting',
        component: VotingComponent
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/command-center/chat/chat.component').then(m => m.ChatComponent)
      }
    ]
  },

  // Default redirect
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Wildcard
  {
    path: '**',
    redirectTo: 'login'
  }
];
