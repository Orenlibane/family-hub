import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary to-kid-secondary p-6">
      <h1 class="text-3xl font-bold text-white mb-6">My Tasks</h1>
      <div class="bg-white rounded-3xl p-6">
        <p class="text-gray-600">All your tasks will appear here!</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyTasksComponent {}
