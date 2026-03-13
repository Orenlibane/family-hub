import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';

@Component({
  selector: 'app-command-center-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-adult-surface">
      <app-sidebar></app-sidebar>
      <main class="flex-1 ml-64">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandCenterLayoutComponent {}
