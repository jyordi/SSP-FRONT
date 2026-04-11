/**
 * Estudio de Trabajo Social — Componente Rediseñado
 * Solo pide los campos que el backend require:
 *   expedienteId, trabajadorSocialId, fechaEstudio,
 *   seccionesJsonb (object libre), opinionPrograma, diagnosticoSocial
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  selector: 'app-estudio-trabajo-social',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './estudio-trabajo-social.component.html',
  styleUrls: ['./estudio-trabajo-social.component.css'],
})
export class EstudioTrabajoSocialComponent implements OnInit {

  private router = inject(Router);
  private penalService = inject(PenalService);
  private session = inject(SessionService);

  // ─── Estado ────────────────────────────────────────────────
  expediente: any = null;
  loading = true;
  guardando = false;
  eliminando = false;
  editandoId: number | null = null;

  vistaActiva: 'formulario' | 'historial' = 'historial';

  historial: any[] = [];
  loadingHistorial = false;
  registroSeleccionado: any = null;

  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── Formulario (Estructura simplificada solicitada) ────────
  fechaEstudio = '';
  opinionPrograma = '';
  diagnosticoSocial = '';

  // seccionesJsonb
  escolaridad = '';
  ocupacion = '';
  delito = '';
  padre = '';
  viviendaTipo = '';

  readonly ESTATUS_OPCIONES = [
    'FAVORABLE', 
    'NO FAVORABLE', 
    'PENDIENTE'
  ];

  // ─── Roles ─────────────────────────────────────────────────
  get role() { return this.session.getRole().toLowerCase(); }
  get esAdmin() { return this.role === 'admin'; }
  get esTrabajoSocial() { return this.role === 'trabajadorsocial' || this.role === 'trabajo_social'; }
  get esPsicologo() { return this.role === 'psicologo'; }
  get esGuia() { return this.role === 'guia'; }

  get puedeCrear() { return this.esAdmin || this.esTrabajoSocial; }
  get puedeEditar() { return this.esAdmin || this.esTrabajoSocial; }
  get puedeEliminar() { return this.esAdmin; }

  get permisoDesc(): string {
    if (this.esAdmin) return 'Acceso Total (Administrador)';
    if (this.esTrabajoSocial) return 'Acceso de Gestión (Trabajo Social)';
    if (this.esPsicologo) return 'Acceso de Consulta (Psicología)';
    if (this.esGuia) return 'Acceso de Consulta (Guía Cívico)';
    return 'Acceso restringido';
  }

  // ─── Init ──────────────────────────────────────────────────
  ngOnInit() {
    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;
    if (navState?.expediente) {
      this.expediente = navState.expediente;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) { try { this.expediente = JSON.parse(raw); } catch {} }
    }

    if (this.expediente?.id) {
      this.loading = false;
      this.rellenarDesdeExpediente();
      this.cargarHistorial();
    } else {
      this.loading = false;
      this.mostrarToast('No se encontró el expediente', 'error');
    }
  }

  rellenarDesdeExpediente() {
    if (!this.expediente) return;
    this.delito = this.expediente.delito || '';
    this.ocupacion = this.expediente.beneficiario?.ocupacion || '';
    this.escolaridad = this.expediente.beneficiario?.escolaridad || '';
    this.fechaEstudio = new Date().toISOString().split('T')[0];
  }

  // ─── Cargar Historial ─────────────────────────────────────
  cargarHistorial() {
    if (!this.expediente?.id) return;
    this.loadingHistorial = true;
    this.penalService.getTrabajoSocialByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.historial = Array.isArray(data) ? data : (data ? [data] : []);
        this.loadingHistorial = false;
        if (this.historial.length && !this.registroSeleccionado) {
          this.seleccionarRegistro(this.historial[0]);
        }
      },
      error: () => { this.historial = []; this.loadingHistorial = false; }
    });
  }

  seleccionarRegistro(r: any) {
    this.registroSeleccionado = r;
  }

  // ─── Validar ──────────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.fechaEstudio) this.errores['fechaEstudio'] = 'Fecha del estudio es obligatoria';
    return Object.keys(this.errores).length === 0;
  }

  // ─── Guardar / Actualizar ─────────────────────────────────
  guardar() {
    this.submitted = true;
    if (!this.validar()) { this.mostrarToast('Completa los campos obligatorios', 'error'); return; }
    if (!this.expediente?.id) return;

    this.guardando = true;

    const seccionesJsonb = {
      datos_generales: {
        escolaridad: this.escolaridad,
        ocupacion: this.ocupacion
      },
      situacion_juridica: {
        delito: this.delito
      },
      nucleo_familiar_primario: {
        padre: this.padre
      },
      vivienda: {
        tipo: this.viviendaTipo
      }
    };

    const payload: any = {
      fechaEstudio: this.fechaEstudio,
      seccionesJsonb,
      opinionPrograma: this.opinionPrograma,
      diagnosticoSocial: this.diagnosticoSocial
    };

    if (this.editandoId) {
      this.penalService.updateTrabajoSocial(this.editandoId, payload).subscribe({
        next: () => { 
          this.guardando = false; 
          this.editandoId = null; 
          this.mostrarToast('Estudio actualizado', 'ok'); 
          this.limpiar(); 
          this.cargarHistorial(); 
          this.vistaActiva = 'historial'; 
        },
        error: (e) => { 
          this.guardando = false; 
          this.mostrarToast(e?.error?.message || 'Error al actualizar', 'error'); 
        }
      });
    } else {
      payload.expedienteId = this.expediente.id;
      payload.trabajadorSocialId = this.session.getUserId();
      
      this.penalService.saveTrabajoSocial(payload).subscribe({
        next: () => { 
          this.guardando = false; 
          this.mostrarToast('Estudio guardado', 'ok'); 
          this.limpiar(); 
          this.cargarHistorial(); 
          this.vistaActiva = 'historial'; 
        },
        error: (e) => { 
          this.guardando = false; 
          this.mostrarToast(e.status === 409 ? 'Ya existe un estudio para este expediente' : 'Error al guardar', 'error'); 
        }
      });
    }
  }

  // ─── Editar ───────────────────────────────────────────────
  editar(item: any) {
    if (!this.puedeEditar) { this.mostrarToast('Sin permiso para editar', 'error'); return; }
    this.editandoId = item.id;
    const s = item.seccionesJsonb || {};
    
    this.fechaEstudio = item.fechaEstudio?.slice(0, 10) || '';
    this.opinionPrograma = item.opinionPrograma || '';
    this.diagnosticoSocial = item.diagnosticoSocial || '';

    this.escolaridad = s.datos_generales?.escolaridad || '';
    this.ocupacion = s.datos_generales?.ocupacion || '';
    this.delito = s.situacion_juridica?.delito || '';
    this.padre = s.nucleo_familiar_primario?.padre || '';
    this.viviendaTipo = s.vivienda?.tipo || '';

    this.vistaActiva = 'formulario';
    this.mostrarToast('✏️ Cargado para editar', 'info');
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.limpiar();
    this.rellenarDesdeExpediente();
    this.vistaActiva = 'historial';
    this.mostrarToast('Edición cancelada', 'info');
  }

  // ─── Eliminar ─────────────────────────────────────────────
  eliminarEstudio(id: number) {
    if (!this.puedeEliminar) { this.mostrarToast('Solo admin puede eliminar', 'error'); return; }
    if (!confirm('¿Eliminar este estudio de trabajo social?')) return;
    this.eliminando = true;
    this.penalService.deleteTrabajoSocial(id).subscribe({
      next: () => { 
        this.eliminando = false; 
        this.registroSeleccionado = null; 
        this.mostrarToast('Eliminado', 'ok'); 
        this.cargarHistorial(); 
      },
      error: () => { this.eliminando = false; this.mostrarToast('Error al eliminar', 'error'); }
    });
  }

  // ─── Utilidades ───────────────────────────────────────────
  limpiar() {
    this.fechaEstudio = new Date().toISOString().split('T')[0];
    this.opinionPrograma = '';
    this.diagnosticoSocial = '';
    this.escolaridad = '';
    this.ocupacion = '';
    this.delito = '';
    this.padre = '';
    this.viviendaTipo = '';
    this.errores = {};
    this.submitted = false;
  }

  formatFecha(v: any): string {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'warn' | 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  volver() {
    this.router.navigate(['/detalle-penal', this.expediente?.id]);
  }
}