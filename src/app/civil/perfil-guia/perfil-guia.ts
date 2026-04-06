import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Busqueda } from '../busqueda/busqueda';

@Component({
  selector: 'app-perfil-guia',
  imports: [CommonModule, ReactiveFormsModule, FormsModule,Busqueda],
  templateUrl: './perfil-guia.html',
  styleUrl: './perfil-guia.css',
})
export class PerfilGuia {

  
  // LÓGICA DEL MODAL DE INASISTENCIAS
  // ==========================================
  mostrarModalInasistencia: boolean = false;
  inasistenciasForm: FormGroup;
  // ==========================================
  // LÓGICA DE LISTA DE ASISTENCIA
  // ==========================================
  planTrabajo: string = 'PRESENTACIONES SOCIALES';
  fechaPlan: string = '';
  observacionesPlan: string = '';

  // ==========================================
  // LÓGICA DE CONTROL DE HORAS (Matemáticas automáticas)
  // ==========================================
  horasTotalesAsignadas: number = 25; // Editable globalmente
  


 
  // Arreglo dinámico para los registros de horas
  registrosHoras = [
    { id: 1, actividad: '19/07/2025 Asistencia inicial', horas: 5 }
  ];

  agregarRegistroHora() {
    this.registrosHoras.push({
      id: Date.now(),
      actividad: '',
      horas: 0
    });
  }

  // Funciones que calculan todo automáticamente
  obtenerAcumuladas(index: number): number {
    let acumulado = 0;
    for (let i = 0; i <= index; i++) {
      acumulado += Number(this.registrosHoras[i].horas) || 0;
    }
    return acumulado;
  }

  obtenerRestantes(index: number): number {
    return this.horasTotalesAsignadas - this.obtenerAcumuladas(index);
  }
  


  // Arreglo dinámico para las filas de asistencia
  listaAsistencia = [
    { id: 1, horario: '10:00 - 12:00', actividad: 'Plática de integración', sede: 'Auditorio Municipal' }
  ];

  agregarFilaAsistencia() {
    this.listaAsistencia.push({
      id: Date.now(),
      horario: '',
      actividad: '',
      sede: ''
    });
  }

  eliminarFilaAsistencia(id: number) {
    this.listaAsistencia = this.listaAsistencia.filter(fila => fila.id !== id);
  }

  // ¡AQUÍ ESTÁ LA SOLUCIÓN AL ERROR!
  // Este es el arreglo que debes usar en el @for de tu HTML
  listaInasistencias = [
    { 
      id: 1, 
      tipo: 'El Sábado 22 de junio se reporta: Inasistencia', 
      descripcion: 'Se le notificó a la joven con antelación para que asistiera a la actividad de "Taller sobre el manejo de las emociones"...' 
    }
  ];

  // Vistas principales de la barra lateral
  vistaLateral: string = 'mis-asignados'; 
  
  // Controla si vemos la lista de jóvenes o el perfil de uno en específico
  vistaPrincipal: 'lista' | 'detalle' = 'lista';
  
  // Controla qué pestaña del perfil estamos viendo
  tabActual: 'horas' | 'inasistencias' | 'asistencia' = 'horas';
  
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

  // 3. INYECTAR FORMBUILDER
  constructor(private fb: FormBuilder, private router: Router) {
    this.inasistenciasForm = this.fb.group({
      tipo: ['', Validators.required],
      descripcion: ['', Validators.required]
    });
  }

  // Funciones del Modal
  abrirModalInasistencia() {
    this.inasistenciasForm.reset();
    this.mostrarModalInasistencia = true;
  }

  cerrarModalInasistencia() {
    this.mostrarModalInasistencia = false;
  }

  guardarInasistencia() {
    if (this.inasistenciasForm.valid) {
      // Creamos un nuevo objeto con los datos del formulario
      const nuevaInasistencia = {
        id: Date.now(), // Generamos un ID temporal
        tipo: this.inasistenciasForm.value.tipo,
        descripcion: this.inasistenciasForm.value.descripcion
      };
      
      // Metemos la nueva inasistencia al arreglo para que se vea en la tabla
      this.listaInasistencias.push(nuevaInasistencia);
      
      // Cerramos el modal
      this.cerrarModalInasistencia();
    } else {
      this.inasistenciasForm.markAllAsTouched();
    }
  }

  descargarPDF(nombreDocumento: string) {
    console.log(`Generando PDF para: ${nombreDocumento}`);
    window.print(); 
  }

  editarRegistro(tipo: string, id: number) {
    console.log(`Abriendo modal para editar ${tipo} con ID: ${id}`);
  }

  eliminarRegistro(tipo: string, id: number) {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar este registro de ${tipo}?`);
    if (confirmar) {
      console.log(`Eliminando ${tipo} con ID: ${id}`);
    }
  }

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
  cambiarTab(tab: 'horas' | 'inasistencias' | 'asistencia') {
    this.tabActual = tab;
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


}