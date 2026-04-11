import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-seleccion',
  standalone: true,
  imports: [CommonModule, NavbarReconectaComponent],
  templateUrl: './seleccion.html',
  styleUrl: './seleccion.css'
})
export class SeleccionComponent {
  constructor(
    private router: Router,
    private location: Location,
    private session: SessionService
  ) {}

  user= { name: 'Psic. Avelina Escárcega' };

  irAModulo(modulo: string) {
    // Navegación según módulo seleccionado
    if (modulo === 'penal') {

      //this.router.navigate(['/vp']);
      this.router.navigate(['/nuevo-expediente-penal']);
    } else if (modulo === 'civico') {

      this.router.navigate(['/nuevo-expediente-civico']);
    } else if (modulo === 'voluntario') {
      this.router.navigate(['voluntarios/personas/nuevo']);
    }
  }

  regresar() {
    this.location.back();
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }

  puedeAccederVoluntarios(): boolean {
    return this.session.puedeAccederVoluntarios();
  }
}
