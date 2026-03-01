import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { FloatingPanelComponent } from './shared/floating-panel/floating-panel.component';
import { CommonModule } from '@angular/common';

@Component({
  imports: [RouterModule, RouterLink, RouterLinkActive, FloatingPanelComponent, CommonModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected title = 'App Builder';
  protected sidebarOpen = signal(true);
  protected sidebarCollapsed = signal(false);
  protected panelOpen = signal(true);
}
