import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormuPsico } from '../formu-psico/formu-psico';
import { SeguimientoPsi } from '../seguimiento-psi/seguimiento-psi';
@Component({
  selector: 'app-perfil-psicologa',
  imports: [CommonModule, FormuPsico, SeguimientoPsi],
  templateUrl: './perfil-psicologa.html',
  styleUrl: './perfil-psicologa.css',
})
export class PerfilPsicologa {

  // Controla qué pantalla se muestra en el área principal
  vistaActual: string = 'inicio';
  
  cambiarVista(vista: string) {
    this.vistaActual = vista;
  }
  // Datos simulados para la tabla del historial
  expedientes = [
    { expediente: 'EXP-2026-001', nombre: 'Juan Pérez López', fechaUltima: '2026-03-01', estado: 'Activo' },
    { expediente: 'EXP-2026-002', nombre: 'María García Ruiz', fechaUltima: '2026-02-28', estado: 'En Seguimiento' },
    { expediente: 'EXP-2026-003', nombre: 'Carlos López Díaz', fechaUltima: '2026-02-15', estado: 'Alta' },
    { expediente: 'EXP-2026-004', nombre: 'Ana Martínez Soto', fechaUltima: '2026-01-20', estado: 'Inactivo' }
  ];

  

  // Función para el botón de cerrar sesión
  cerrarSesion() {
    console.log('Cerrando sesión...');
    // Aquí iría tu lógica para regresar a la pantalla de Login
  }
}
