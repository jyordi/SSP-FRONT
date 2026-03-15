import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormuPsico } from '../formu-psico/formu-psico';
import { SeguimientoPsi } from '../seguimiento-psi/seguimiento-psi';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-perfil-psicologa',
  imports: [CommonModule, FormuPsico, SeguimientoPsi, FormsModule],
  templateUrl: './perfil-psicologa.html',
  styleUrl: './perfil-psicologa.css',
})
export class PerfilPsicologa {
vistaActual: string = 'inicio';
  
  // Las 3 pestañas que me pediste dentro del detalle
  tabDetalle: 'ver-entrevista' | 'crear-nota' | 'ficha-tecnica' = 'ver-entrevista';
  
  pacienteSeleccionado: any = null;

  // Datos simulados (Le agregamos datos de entrevista para el modo lectura)
  expedientes = [
    { 
      expediente: 'EXP-2026-001', nombre: 'Juan Pérez López', fechaUltima: '2026-03-01', estado: 'Activo',
      entrevistaRealizada: {
        edad: 22, curp: 'PELJ040101HDFR00', escolaridad: 'Preparatoria', ocupacion: 'Estudiante',
        fechaDetencion: '15/02/2026', motivo: 'Alteración del orden público en vía pública.',
        diagnosticoPrevio: 'Ansiedad leve, refiere insomnio ocasional.'
      }
    },
    { 
      expediente: 'EXP-2026-002', nombre: 'María García Ruiz', fechaUltima: '2026-02-28', estado: 'En Seguimiento',
      entrevistaRealizada: {
        edad: 19, curp: 'GARM070512MDFR05', escolaridad: 'Secundaria', ocupacion: 'Empleada de mostrador',
        fechaDetencion: '20/02/2026', motivo: 'Consumo de sustancias en vía pública.',
        diagnosticoPrevio: 'Requiere seguimiento por riesgo de adicciones.'
      }
    }
  ];

  cambiarVista(vista: string) {
    this.vistaActual = vista;
    this.pacienteSeleccionado = null; 
  }

  // Al dar clic en la tabla
  verDetalles(paciente: any) {
    this.pacienteSeleccionado = paciente;
    this.vistaActual = 'detalle';
    this.tabDetalle = 'ver-entrevista'; // Por defecto abre el modo lectura de la entrevista
  }

  volverHistorial() {
    this.vistaActual = 'historial';
    this.pacienteSeleccionado = null;
  }

  cerrarSesion() {
    console.log('Cerrando sesión de Psicología...');
  }
}
