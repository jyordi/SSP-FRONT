import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session';

@Component({
  selector: 'app-navbar-reconecta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar-reconecta.html',
  styleUrls: ['./navbar-reconecta.css']
})
export class NavbarReconectaComponent {

  constructor(
    private router: Router,
    private session: SessionService
  ) {}

  get nombre() {
    return this.session.getUserName();
  }

  get rol() {
    return this.session.getRole();
  }

  irExpedientes() {
    this.router.navigate(['/expedientes']);
  }

  logout() {
    this.session.clearSession();
    this.router.navigate(['/login']);
  }
}