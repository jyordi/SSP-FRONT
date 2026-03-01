import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-seleccion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seleccion.html',
  styleUrl: './seleccion.css'
})
export class SeleccionComponent {
  constructor(private router: Router) {}

  irAModulo(modulo: string) {
    // Aquí navegarás a la pantalla correspondiente después
    console.log(`Abriendo Módulo: ${modulo}`);
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}