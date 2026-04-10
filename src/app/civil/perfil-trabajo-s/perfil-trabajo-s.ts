import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Busqueda } from "../busqueda/busqueda";
import { Router } from '@angular/router';

import { EstudioTsCivicoComponent } from '../estudio-ts-civico/estudio-ts-civico';

@Component({
  selector: 'app-perfil-trabajo-s',
  imports: [CommonModule, FormsModule, Busqueda, EstudioTsCivicoComponent],
  templateUrl: './perfil-trabajo-s.html',
  styleUrl: './perfil-trabajo-s.css',
})
export class PerfilTrabajoS {

  vistaLateral: 'pendientes' | 'historial' = 'pendientes';
 vistaPrincipal: 'inicio' | 'lista' | 'detalle' = 'inicio';
  tabActual: 'estudio' | 'plan' = 'estudio';  
  personaSeleccionada: any = null;

  constructor(private router: Router) {}

  // Plantilla base para las actividades de seguimiento
  generarActividadesBase() {
    return [
      { nombre: 'EDUCATIVA', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'PSICOSOCIAL', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'RED DE APOYO', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'PSICOLÓGICA', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'ADICCIONES', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'FAMILIAR', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'LABORAL', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'DEPORTIVA', estatus: '', objetivo: '', cumplimiento: '' },
      { nombre: 'CULTURAL', estatus: '', objetivo: '', cumplimiento: '' }
    ];
  }

  // Datos simulados actualizados al nuevo formato
  personas = [
    { 
      id: 1, nombre: 'Luis Rodríguez Silva', expediente: 'EXP-2026-030', estado: 'pendiente',
      estudioWord: '', 
      planTrabajo: { 
        actividadesSeguimiento: this.generarActividadesBase(),
        observaciones: ''
      }
    },
    { 
      id: 2, nombre: 'Sofía Castro Mendoza', expediente: 'EXP-2026-031', estado: 'pendiente',
      estudioWord: '',
      planTrabajo: { 
        actividadesSeguimiento: this.generarActividadesBase(),
        observaciones: ''
      }
    },
    { 
      id: 3, nombre: 'Miguel Ángel Torres', expediente: 'EXP-2026-005', estado: 'completado', 
      estudioWord: 'El usuario se presenta a la entrevista mostrando disposición...',
      planTrabajo: { 
        actividadesSeguimiento: this.generarActividadesBase(), // (Aquí llevaría datos reales llenados)
        observaciones: 'El joven ha mostrado mucho avance.'
      }
    }
  ];

  get personasFiltradas() {
    return this.personas.filter(p => p.estado === (this.vistaLateral === 'pendientes' ? 'pendiente' : 'completado'));
  }

  cambiarVistaLateral(vista: 'pendientes' | 'historial') {
    this.vistaLateral = vista;
    this.volverALista();
  }

  verDetalle(persona: any) {
    this.personaSeleccionada = persona;
    this.vistaPrincipal = 'detalle';
    this.tabActual = 'estudio';
  }

  volverALista() {
    this.vistaPrincipal = 'inicio';
    this.personaSeleccionada = null;
  }

  cambiarTab(tab: 'estudio' | 'plan') {
    this.tabActual = tab;
  }

  guardarYCompletar() {
    if (this.personaSeleccionada) {
      this.personaSeleccionada.estado = 'completado';
      alert('Documentos guardados correctamente. El expediente ha pasado al Historial.');
      this.volverALista();
    }
  }

  descargarPDF(nombre: string) {
    window.print();
  }

 irAPendientes() {
  this.vistaLateral = 'pendientes';
  this.vistaPrincipal = 'lista';
}

irAHistorial() {
  this.vistaLateral = 'historial';
  this.vistaPrincipal = 'lista';
}

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

get textoBotonVolver(): string {
  return this.vistaPrincipal === 'detalle'
    ? 'Volver a lista'
    : 'Volver a inicio';
}

get iconoBotonVolver(): string {
  return this.vistaPrincipal === 'detalle'
    ? '←'
    : '🏠';
}

volver() {
  if (this.vistaPrincipal === 'detalle') {
    this.vistaPrincipal = 'lista';
    this.personaSeleccionada = null;
  } else {
    this.vistaPrincipal = 'inicio';
  }
}
}
