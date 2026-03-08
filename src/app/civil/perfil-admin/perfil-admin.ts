import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-perfil-admin',
  imports: [CommonModule],
  templateUrl: './perfil-admin.html',
  styleUrl: './perfil-admin.css',
})
export class PerfilAdmin {

  vistaLateral: 'expedientes' | 'estadisticas' = 'expedientes';
  vistaPrincipal: 'lista' | 'detalle' = 'lista';
  tabActual: 'resumen' | 'psicologia' | 'guias' | 'tsocial' | 'oficio' = 'resumen';
  personaSeleccionada: any = null;

  // Fecha actual para el oficio
  fechaHoy: string = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // Base de datos maestra (Simulación del Expediente Único)
  expedientesMaestros = [
    { 
      id: 1, 
      nombre: 'Carlos López Díaz', 
      expediente: 'EXP-2026-015', 
      estadoGeneral: 'En Proceso',
      datosGenerales: { edad: 19, curp: 'LODC060515HDFR01', telefono: '951-555-0123' },
      
      // Datos de la Psicóloga
      psicologia: { 
        entrevistaCompletada: true, 
        totalNotas: 3, 
        ultimaSesion: '15/02/2026' 
      },
      
      // Datos del Guía
      guias: { 
        horasTotales: 25, 
        horasCubiertas: 15, // Le faltan 10 horas
        inasistencias: 1,
        actividadActual: 'Presentaciones Sociales'
      },

      // Datos de Trabajo Social
      trabajoSocial: { 
        estudioRealizado: true, 
        planTrabajoDefinido: true 
      }
    },
    { 
      id: 2, 
      nombre: 'Miguel Ángel Torres', 
      expediente: 'EXP-2026-005', 
      estadoGeneral: 'Finalizado',
      datosGenerales: { edad: 21, curp: 'TOMM050110HDFR08', telefono: '951-555-0987' },
      
      psicologia: { entrevistaCompletada: true, totalNotas: 5, ultimaSesion: '28/02/2026' },
      
      guias: { 
        horasTotales: 25, 
        horasCubiertas: 25, // ¡YA CUMPLIÓ SUS HORAS!
        inasistencias: 0,
        actividadActual: 'Concluido'
      },

      trabajoSocial: { estudioRealizado: true, planTrabajoDefinido: true }
    }
  ];

  cambiarVistaLateral(vista: 'expedientes' | 'estadisticas') {
    this.vistaLateral = vista;
    this.volverALista();
  }

  verDetalle(persona: any) {
    this.personaSeleccionada = persona;
    this.vistaPrincipal = 'detalle';
    this.tabActual = 'resumen';
  }

  volverALista() {
    this.vistaPrincipal = 'lista';
    this.personaSeleccionada = null;
  }

  cambiarTab(tab: 'resumen' | 'psicologia' | 'guias' | 'tsocial' | 'oficio') {
    this.tabActual = tab;
  }

  // Verifica si el joven ya cumplió sus horas para liberar el documento
  puedeGenerarOficio(): boolean {
    if (!this.personaSeleccionada) return false;
    return this.personaSeleccionada.guias.horasCubiertas >= this.personaSeleccionada.guias.horasTotales;
  }

  descargarOficio() {
    if (this.puedeGenerarOficio()) {
      window.print();
    } else {
      alert('El usuario aún no cumple con las horas establecidas.');
    }
  }

  cerrarSesion() {
    console.log('Cerrando sesión de Administrador...');
  }
}
