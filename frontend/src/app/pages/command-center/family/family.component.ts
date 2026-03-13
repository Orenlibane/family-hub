import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-adult-surface p-6">
      <h1 class="text-3xl font-bold text-adult-dark mb-6">Family Members</h1>
      <p class="text-gray-600">Family management page - Coming soon</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FamilyComponent {}
