import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent, NavbarConfig } from './voluntarios/shared/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
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
