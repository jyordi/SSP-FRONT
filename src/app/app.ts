import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent, NavbarConfig } from './voluntarios/shared/navbar/navbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  showNavbar: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      this.showNavbar = this.router.url.includes('/voluntarios');
    });
  }

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
