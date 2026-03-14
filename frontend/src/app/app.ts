import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    // Theme is applied automatically by ThemeService constructor
    // This ensures the service is instantiated on app start
    const theme = this.themeService.getCurrentTheme();
    this.themeService.applyThemeToDocument(theme);
  }
}
