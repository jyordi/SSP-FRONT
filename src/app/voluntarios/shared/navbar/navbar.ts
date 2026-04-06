import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';

export interface NavbarConfig {
  brandName: string;
  brandSubtitle: string;
  brandIcon: string;
  links: NavLink[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  showAvatar?: boolean;
  avatarText?: string;
}

export interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  @Input() config: NavbarConfig = {
    brandName: 'App',
    brandSubtitle: 'Subtítulo',
    brandIcon: '🏠',
    links: [],
    searchPlaceholder: 'Buscar...',
    showSearch: true,
    showAvatar: true,
    avatarText: 'U'
  };

  constructor(private authService: AuthService, private router: Router) {}

  logout(): void {
    // Limpiar localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirigir a login
    this.router.navigate(['/login']);
  }
}
