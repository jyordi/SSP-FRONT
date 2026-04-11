import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './historial-supervision.html',
  styleUrls: ['./historial-supervision.css']
})
export class HistorialSupervisionComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';
  userId = 0;

  // ─── VISTA ────────────────────────────────────────────────
  vistaActiva: 'nueva' | 'historial' = 'historial';

  // ─── HISTORIAL ────────────────────────────────────────────
  registros: any[] = [];
  loadingRegistros = false;
  registroSeleccionado: any = null;
  modoEdicion = false;
  eliminando = false;

  // ─── TOAST ────────────────────────────────────────────────
  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;

  // ─── VALIDACIÓN ───────────────────────────────────────────
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── FORMULARIO ───────────────────────────────────────────
  mes: number | null = null;
  periodo = '';
  fechaInicio = '';
  fechaFin = '';
  estatus = 'PARCIAL';
  observaciones = '';

  readonly ESTATUS_OPCIONES = ['CUMPLIDO', 'PARCIAL', 'INCUMPLIDO'];
  readonly MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private penalService: PenalService,
    private session: SessionService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    this.userId = this.session.getUserId?.() ?? 0;

    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;
    if (navState?.expediente) {
      this.expediente = navState.expediente;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try { this.expediente = JSON.parse(raw); } catch {}
      }
    }

    if (this.expediente?.id) {
      this.loading = false;
      this.cargarRegistros();
    } else {
      const id = this.route.snapshot.params['id'];
      if (id) {
        this.loading = false;
        this.expediente = { id: +id };
        this.cargarRegistros();
      } else {
        this.loading = false;
        this.mostrarToast('No se encontró el expediente', 'error');
      }
    }
  }

  get userRole() { return this.role?.toLowerCase() || 'invitado'; }
  get esAdmin() { return this.userRole === 'admin'; }
  get esGuia() { return this.userRole === 'guia'; }
  get esPsicologo() { return this.userRole === 'psicologo'; }
  get esTrabajoSocial() { return this.userRole === 'trabajo_social' || this.userRole === 'trabajadorsocial'; }
  
  get puedeCrear() { return this.esAdmin || this.esGuia; }
  get puedeEditar() { return this.esAdmin || this.esGuia; }
  get puedeEliminar() { return this.esAdmin; }

  get permisoDesc(): string {
    if (this.esAdmin) return 'Acceso Total (Administrador)';
    if (this.esGuia) return 'Acceso de Registro (Guía Cívico)';
    if (this.esTrabajoSocial) return 'Acceso de Consulta (T. Social)';
    if (this.esPsicologo) return 'Acceso de Consulta (Psicología)';
    return 'Acceso restringido';
  }

  // ─── CARGAR HISTORIAL ───────────────────────────────────────
  cargarRegistros() {
    if (!this.expediente?.id) return;
    this.loadingRegistros = true;
    this.penalService.getHistorialByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        this.registros = Array.isArray(res) ? res : [res];
        this.loadingRegistros = false;
        if (this.registros.length && !this.registroSeleccionado) {
          this.seleccionarRegistro(this.registros[0]);
        }
      },
      error: () => {
        this.registros = [];
        this.loadingRegistros = false;
      }
    });
  }

  seleccionarRegistro(r: any) {
    this.registroSeleccionado = r;
    this.modoEdicion = false;
  }

  // ─── VALIDAR ────────────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.mes || this.mes < 1 || this.mes > 12) this.errores['mes'] = 'Selecciona un mes válido';
    if (!this.periodo?.trim()) this.errores['periodo'] = 'El periodo es obligatorio';
    if (!this.fechaInicio) this.errores['fechaInicio'] = 'La fecha de inicio es obligatoria';
    if (!this.fechaFin) this.errores['fechaFin'] = 'La fecha de fin es obligatoria';
    return Object.keys(this.errores).length === 0;
  }

  // ─── GUARDAR ────────────────────────────────────────────────
  guardarRegistro() {
    this.submitted = true;
    if (!this.validar()) {
      this.mostrarToast('Completa los campos obligatorios', 'error');
      return;
    }
    if (!this.expediente?.id) return;

    this.guardando = true;
    const payload = {
      expedienteId: this.expediente.id,
      mes: this.mes,
      periodo: this.periodo.toUpperCase(),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      estatus: this.estatus,
      observaciones: this.observaciones
    };

    this.penalService.createHistorial(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('Registro guardado correctamente', 'ok');
        this.limpiarFormulario();
        this.cargarRegistros();
        this.vistaActiva = 'historial';
      },
      error: (err) => {
        this.guardando = false;
        if (err.status === 409) {
          this.mostrarToast('Ya existe un registro para este mes', 'error');
        } else {
          this.mostrarToast('Error al guardar el registro', 'error');
        }
      }
    });
  }

  // ─── EDITAR ─────────────────────────────────────────────────
  iniciarEdicion() {
    if (!this.registroSeleccionado || !this.puedeEditar) return;
    this.modoEdicion = true;
  }

  guardarEdicion() {
    if (!this.registroSeleccionado) return;
    this.guardando = true;

    const payload: any = {
      mes: this.registroSeleccionado.mes,
      periodo: this.registroSeleccionado.periodo,
      fechaInicio: this.registroSeleccionado.fechaInicio?.slice(0, 10),
      fechaFin: this.registroSeleccionado.fechaFin?.slice(0, 10),
      estatus: this.registroSeleccionado.estatus,
      observaciones: this.registroSeleccionado.observaciones
    };

    this.penalService.updateHistorial(this.registroSeleccionado.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.modoEdicion = false;
        this.mostrarToast('Registro actualizado', 'ok');
        this.cargarRegistros();
      },
      error: () => {
        this.guardando = false;
        this.mostrarToast('Error al actualizar', 'error');
      }
    });
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.cargarRegistros();
  }

  // ─── ELIMINAR ───────────────────────────────────────────────
  eliminarRegistro() {
    if (!this.registroSeleccionado || !this.puedeEliminar) return;
    if (!confirm('¿Estás seguro de eliminar este registro de supervisión?')) return;

    this.eliminando = true;
    this.penalService.deleteHistorial(this.registroSeleccionado.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.registroSeleccionado = null;
        this.mostrarToast('Registro eliminado', 'ok');
        this.cargarRegistros();
      },
      error: () => {
        this.eliminando = false;
        this.mostrarToast('Error al eliminar', 'error');
      }
    });
  }

  // ─── UTILIDADES ─────────────────────────────────────────────
  limpiarFormulario() {
    this.mes = null;
    this.periodo = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.estatus = 'PARCIAL';
    this.observaciones = '';
    this.errores = {};
    this.submitted = false;
  }

  formatFecha(v: any): string {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getNombreMes(n: number): string {
    return this.MESES[n - 1] || `Mes ${n}`;
  }

  getEstatusClass(e: string): string {
    switch (e) {
      case 'CUMPLIDO': return 'badge-ok';
      case 'PARCIAL': return 'badge-warn';
      case 'INCUMPLIDO': return 'badge-err';
      default: return '';
    }
  }

  getEstatusIcon(e: string): string {
    switch (e) {
      case 'CUMPLIDO': return '✅';
      case 'PARCIAL': return '⚠️';
      case 'INCUMPLIDO': return '❌';
      default: return '📋';
    }
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'warn' | 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  volver() {
    this.router.navigate(['/detalle-penal', this.expediente?.id]);
  }
}
