import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-seleccion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seleccion.html',
  styleUrl: './seleccion.css'
})
export class SeleccionComponent {
  constructor(private router: Router, private location: Location) {}

  user= { name: 'Psic. Avelina Escárcega' };

  irAModulo(modulo: string) {
    // Navegación según módulo seleccionado
    if (modulo === 'penal') {
      this.router.navigate(['/vp']);
    } else if (modulo === 'civico') {

      this.router.navigate(['/nuevo-expediente-civico']);
    } else if (modulo === 'voluntario') {
      this.router.navigate(['/voluntarios/personas']);
    }
  }

  regresar() {
    this.location.back();
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}
