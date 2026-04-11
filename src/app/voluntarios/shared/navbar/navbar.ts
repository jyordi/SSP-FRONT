import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../services/session';

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

  constructor(
    private router: Router,
    private session: SessionService
  ) {}

  get nombre(): string {
    return this.session.getUserName();
  }

  get rol(): string {
    return this.session.getRole();
  }

  get avatarText(): string {
    const nombre = this.nombre?.trim();

    if (nombre) {
      return nombre.charAt(0).toUpperCase();
    }

    return this.config.avatarText || 'U';
  }

  logout(): void {
    this.session.logout();
    this.router.navigate(['/login']);
  }
}
