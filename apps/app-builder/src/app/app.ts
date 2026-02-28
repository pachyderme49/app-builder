import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule, RouterLink, RouterLinkActive],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected title = 'App Builder';
  protected sidebarOpen = signal(true);
}
