import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';

@Component({
  selector: 'app-command-center-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="layout" dir="rtl">
      <app-sidebar></app-sidebar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      min-height: 100vh;
      background: var(--theme-background-gradient);
    }

    .main-content {
      margin-right: 260px;
      min-height: 100vh;
    }

    @media (max-width: 768px) {
      .main-content {
        margin-right: 0;
        padding-bottom: 80px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandCenterLayoutComponent {}
