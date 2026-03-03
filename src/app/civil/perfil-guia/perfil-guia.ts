import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-perfil-guia',
  imports: [CommonModule],
  templateUrl: './perfil-guia.html',
  styleUrl: './perfil-guia.css',
})
export class PerfilGuia {

  // Vistas principales de la barra lateral
  vistaLateral: string = 'mis-asignados'; 
  
  // Controla si vemos la lista de jóvenes o el perfil de uno en específico
  vistaPrincipal: 'lista' | 'detalle' = 'lista';
  
  // Controla qué pestaña del perfil estamos viendo
  tabActual: 'horas' | 'incidencias' | 'asistencia' = 'horas';
  
  // Usuario seleccionado actualmente
  jovenSeleccionado: any = null;

  // Datos simulados de los jóvenes asignados
  jovenesAsignados = [
    { 
      id: 1, 
      nombre: 'Carlos López Díaz', 
      expediente: 'EXP-2026-015', 
      horasCubiertas: 15, 
      horasTotales: 25,
      actividadActual: 'Presentaciones Sociales'
    },
    { 
      id: 2, 
      nombre: 'Ana Martínez Soto', 
      expediente: 'EXP-2026-022', 
      horasCubiertas: 5, 
      horasTotales: 25,
      actividadActual: 'Taller de Emociones'
    }
  ];

  // Navegación del menú lateral
  cambiarVistaLateral(vista: string) {
    this.vistaLateral = vista;
    if (vista === 'mis-asignados') {
      this.volverALista();
    }
  }

  // Abrir el perfil de un joven
  verDetalle(joven: any) {
    this.jovenSeleccionado = joven;
    this.vistaPrincipal = 'detalle';
    this.tabActual = 'horas'; // Por defecto abre en Control de Horas
  }

  // Regresar a la lista de asignados
  volverALista() {
    this.vistaPrincipal = 'lista';
    this.jovenSeleccionado = null;
  }

  // Cambiar entre las pestañas del perfil del joven
  cambiarTab(tab: 'horas' | 'incidencias' | 'asistencia') {
    this.tabActual = tab;
  }

  cerrarSesion() {
    console.log('Cerrando sesión de Guía...');
  }

}
