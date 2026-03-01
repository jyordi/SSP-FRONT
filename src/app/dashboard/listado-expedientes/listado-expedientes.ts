import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-listado-expedientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listado-expedientes.html',
  styleUrl: './listado-expedientes.css'
})
export class ListadoExpedientes {
  // Lista simulada de personas en el programa
  expedientes = [
    { id: 1, folio: 'DGPDyPC-RCP-001', nombre: 'Juan Pérez López', delito: 'Daño a las cosas', avance: 45, estatus: 'En Proceso', proximaCita: '15/Nov/2025' },
    { id: 2, folio: 'DGPDyPC-RCP-002', nombre: 'María González Ruiz', delito: 'Lesiones leves', avance: 80, estatus: 'Favorable', proximaCita: '18/Nov/2025' },
    { id: 3, folio: 'DGPDyPC-RCP-003', nombre: 'Carlos Ruiz Sánchez', delito: 'Robo simple', avance: 10, estatus: 'Riesgo', proximaCita: 'Mañana' },
    { id: 4, folio: 'DGPDyPC-RCP-004', nombre: 'Ana Victoria Méndez', delito: 'Daño a las cosas', avance: 100, estatus: 'Completado', proximaCita: 'Finalizado' }
  ];

  constructor(private router: Router) {}

  continuarSeguimiento(id: number) {
    console.log('Abriendo expediente:', id);
    // Aquí a futuro pondremos: this.router.navigate(['/expediente', id]);
  }
  // 👇 ESTA ES LA NUEVA FUNCIÓN 👇
  nuevoIngreso() {
    // Redirige a la pantalla donde te pregunta el módulo (Penal, Cívico, Voluntario)
    this.router.navigate(['/seleccion']);
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}