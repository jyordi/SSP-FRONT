import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent, NavbarConfig } from './voluntarios/shared/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar [config]="navbarConfig" />
    <main class="page-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .page-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
  `]
})
export class AppComponent {
  navbarConfig: NavbarConfig = {
    brandName: 'Reconecta con la Paz',
    brandSubtitle: 'Gobierno del Estado de Oaxaca',
    brandIcon: '🕊️',
    links: [
      { label: 'Actividades', path: '/voluntarios/actividades' },
      { label: 'Personas', path: '/voluntarios/personas' }
    ],
    searchPlaceholder: 'Buscar...',
    showSearch: true,
    showAvatar: true,
    avatarText: 'H'
  };
}
