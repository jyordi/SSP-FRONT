import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Busqueda } from '../busqueda/busqueda';
@Component({
  selector: 'app-perfil-admin',
  imports: [CommonModule, FormsModule,Busqueda],
  templateUrl: './perfil-admin.html',
  styleUrl: './perfil-admin.css',
}) 
export class PerfilAdmin {

  vistaLateral: 'expedientes' | 'estadisticas' = 'expedientes';
  vistaPrincipal: 'lista' | 'detalle' = 'lista';
  tabActual: 'resumen' | 'psicologia' | 'guias' | 'tsocial' | 'oficio' = 'resumen';
  personaSeleccionada: any = null;

  // ==========================================
  // CONFIGURACIÓN DE LA PLANTILLA OFICIAL
  // ==========================================
  mostrarModalPlantilla: boolean = false;

  constructor(private router: Router) {}
  // Datos fijos que rara vez cambian (Se editan en el modal)
  plantillaOficial = {
    lemaAnual: '"2025, BICENTENARIO DE LA PRIMERA CONSTITUCIÓN POLÍTICA DEL ESTADO LIBRE Y SOBERANO DE OAXACA"',
    seccion: 'Dirección General de Prevención del Delito y Participación Ciudadana',
    asunto: 'Constancia de Conclusión de Actividades',
    destinatario: 'JUEZ CÍVICO MUNICIPAL ESPECIALIZADO EN\nFALTAS ADMINISTRATIVAS PARA LA BUENA\nCONVIVENCIA COMUNITARIA.\nP R E S E N T E',
    coordinadorNombre: 'Lic. Nombre del Coordinador',
    coordinadorTel: '951-000-0000',
    coordinadorCorreo: 'reconecta@oaxaca.gob.mx',
    lemasDespedida: '“SUFRAGIO EFECTIVO. NO REELECCIÓN”\n“EL RESPETO AL DERECHO AJENO ES LA PAZ”',
    directorNombre: 'MTRA. LII YIO PÉREZ ZÁRATE',
    directorCargo: 'DIRECTORA GENERAL DE PREVENCIÓN DEL DELITO\nY PARTICIPACIÓN CIUDADANA',
    piePagina: 'Dirección Oficial. Teléfono: 951-000-0000'
  };

  // Datos variables que el Admin llena antes de imprimir
  datosOficio = {
    lcdoEncabezado: '',
    noOficio: '',
    oficioInicial: '',
    fechaInicial: '',
    juezRemitente: '',
    actividad1: '',
    actividad2: '',
    actividad3: ''
  };

  fechaHoy: string = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // Base de datos maestra (Mismos datos de tu versión anterior)
// Base de datos maestra (Con los detalles completos de cada área)
  expedientesMaestros = [
    { 
      id: 1, nombre: 'Carlos López Díaz', expediente: 'EXP-2026-015', estadoGeneral: 'En Proceso',
      datosGenerales: { edad: 19, curp: 'LODC060515HDFR01', telefono: '951-555-0123' },
      
      // Detalles Psicología
      psicologia: { 
        entrevistaCompletada: true, 
        motivoConsulta: 'Canalizado por juez cívico por faltas administrativas (alteración del orden público).',
        diagnostico: 'Dificultad en el control de impulsos. Red de apoyo familiar intermitente.',
        notasEvolucion: [
          { fecha: '10/02/2026', nota: 'Se presenta a la primera sesión con actitud defensiva. Se establecen reglas y encuadre.' },
          { fecha: '15/02/2026', nota: 'Muestra mayor apertura. Trabajamos técnicas de respiración para manejo de ira.' }
        ]
      },

      // Detalles Guías
      guias: { 
        horasTotales: 25, horasCubiertas: 15,
        registrosHoras: [
          { fecha: '19/01/2026', actividad: 'Asistencia inicial y Plática', horas: 5 },
          { fecha: '25/01/2026', actividad: 'Taller de integración comunitaria', horas: 10 }
        ],
        inasistencias: [
          { fecha: '05/02/2026', tipo: 'Falta Injustificada', descripcion: 'No se presentó a la actividad programada ni avisó con anticipación.' }
        ]
      },

      // Detalles Trabajo Social
      trabajoSocial: { 
        estudioRealizado: true, 
        estudioWord: 'El usuario reside en zona semi-urbana, cuenta con todos los servicios básicos. Ingreso económico dependiente de la madre. Se observa disposición al cambio tras el incidente.',
        planTrabajo: {
          observaciones: 'El joven requiere apoyo constante para no desertar escolarmente.',
          actividadesSeguimiento: [
            { nombre: 'EDUCATIVA', estatus: 'EN PROCESO', objetivo: 'Concluir bachillerato', cumplimiento: 'Asistencia regular a clases' },
            { nombre: 'PSICOLÓGICA', estatus: 'ACTIVO', objetivo: 'Manejo de emociones', cumplimiento: 'Asiste a citas programadas' }
          ]
        }
      }
    },
    // ... (Puedes dejar el segundo usuario de Miguel Ángel Torres igual, solo agregando arreglos vacíos para que no marque error)
    { 
      id: 2, nombre: 'Miguel Ángel Torres', expediente: 'EXP-2026-005', estadoGeneral: 'Finalizado',
      datosGenerales: { edad: 21, curp: 'TOMM050110HDFR08', telefono: '951-555-0987' },
      psicologia: { entrevistaCompletada: true, motivoConsulta: 'Falta menor.', diagnostico: 'Estable.', notasEvolucion: [{ fecha: '28/02/2026', nota: 'Alta psicológica.' }] },
      guias: { horasTotales: 25, horasCubiertas: 25, registrosHoras: [{ fecha: '20/02/2026', actividad: 'Tequio y conclusión', horas: 25 }], inasistencias: [] },
      trabajoSocial: { estudioRealizado: true, estudioWord: 'Estudio completado favorablemente.', planTrabajo: { observaciones: 'Ninguna', actividadesSeguimiento: [] } }
    }
  ];

  cambiarVistaLateral(vista: 'expedientes' | 'estadisticas') { this.vistaLateral = vista; this.volverALista(); }
  verDetalle(persona: any) { this.personaSeleccionada = persona; this.vistaPrincipal = 'detalle'; this.tabActual = 'resumen'; }
  volverALista() { this.vistaPrincipal = 'lista'; this.personaSeleccionada = null; }
  cambiarTab(tab: 'resumen' | 'psicologia' | 'guias' | 'tsocial' | 'oficio') { this.tabActual = tab; }
  puedeGenerarOficio(): boolean { return this.personaSeleccionada && this.personaSeleccionada.guias.horasCubiertas >= this.personaSeleccionada.guias.horasTotales; }
  descargarOficio() { if (this.puedeGenerarOficio()) window.print(); else alert('Faltan horas.'); }
  cerrarSesion() { console.log('Cerrando sesión de Administrador...'); }
  
  // Funciones Modal
  abrirModalPlantilla() { this.mostrarModalPlantilla = true; }
  cerrarModalPlantilla() { this.mostrarModalPlantilla = false; }


  showLogoutModal: boolean = false;

openLogoutModal() {
  this.showLogoutModal = true;
}

closeLogoutModal() {
  this.showLogoutModal = false;
}

logout() {
  localStorage.clear();
  this.closeLogoutModal();
  this.router.navigate(['/login']);
}

}
