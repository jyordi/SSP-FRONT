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
  templateUrl: './nota-evolucion.html',
  styleUrls: ['./nota-evolucion.css']
})
export class NotaEvolucionComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';
  userId = 0;

  // ─── VISTA ─────────────────────────────────────────────────
  vistaActiva: 'nueva' | 'historial' = 'historial';

  // ─── HISTORIAL ─────────────────────────────────────────────
  notas: any[] = [];
  loadingNotas = false;
  notaSeleccionada: any = null;
  modoEdicion = false;
  eliminando = false;
  descargandoPdf = false;

  // ─── TOAST ─────────────────────────────────────────────────
  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;

  // ─── VALIDACIÓN ────────────────────────────────────────────
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── FORMULARIO ────────────────────────────────────────────
  fecha = '';
  numeroSesion: number | null = null;
  objetivoSesion = '';
  descripcionSesion = '';
  tecnicasAplicadas = '';
  avances = '';
  observaciones = '';
  proximaSesion = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private penalService: PenalService,
    private session: SessionService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    this.userId = this.session.getUserId?.() ?? this._parseUserId() ?? 0;

    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;
    if (navState?.expediente) {
      this.expediente = navState.expediente;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) { try { this.expediente = JSON.parse(raw); } catch {} }
    }

    if (this.expediente?.id) {
      this.loading = false;
      this.cargarNotas();
    } else {
      const id = this.route.snapshot.params['id'];
      if (id) {
        this.loading = false;
        this.expediente = { id: +id };
        this.cargarNotas();
      } else {
        this.loading = false;
        this.mostrarToast('No se encontró el expediente', 'error');
      }
    }
  }

  // ─── ROLES ──────────────────────────────────────────────────
  get esAdmin() { return this.role === 'admin'; }
  get esPsicologo() { return this.role === 'psicologo'; }
  get esGuia() { return this.role === 'guia'; }
  get esTrabajoSocial() { return this.role === 'trabajo_social'; }
  get puedeCrear() { return this.esAdmin || this.esPsicologo; }
  get puedeEditar() { return this.esAdmin || this.esPsicologo; }
  get puedeEliminar() { return this.esAdmin; }

  // ─── CARGAR NOTAS ───────────────────────────────────────────
  cargarNotas() {
    if (!this.expediente?.id) return;
    this.loadingNotas = true;
    this.penalService.getNotasByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        this.notas = Array.isArray(res) ? res : [res];
        this.loadingNotas = false;
        if (this.notas.length && !this.notaSeleccionada) {
          this.seleccionarNota(this.notas[0]);
        }
      },
      error: () => { this.notas = []; this.loadingNotas = false; }
    });
  }

  seleccionarNota(n: any) {
    this.notaSeleccionada = { ...n };
    this.modoEdicion = false;
  }

  // ─── VALIDAR ────────────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.fecha) this.errores['fecha'] = 'La fecha es obligatoria';
    if (!this.numeroSesion || this.numeroSesion < 1) this.errores['numeroSesion'] = 'Número de sesión inválido';
    if (!this.objetivoSesion?.trim()) this.errores['objetivoSesion'] = 'El objetivo es obligatorio';
    return Object.keys(this.errores).length === 0;
  }

  // ─── GUARDAR ────────────────────────────────────────────────
  guardarNota() {
    this.submitted = true;
    if (!this.validar()) { this.mostrarToast('Completa los campos obligatorios', 'error'); return; }
    if (!this.expediente?.id) return;

    this.guardando = true;
    const payload = {
      expedienteId: this.expediente.id,
      psicologoId: this.userId,
      fecha: this.fecha,
      numeroSesion: this.numeroSesion,
      objetivoSesion: this.objetivoSesion,
      descripcionSesion: this.descripcionSesion,
      tecnicasAplicadas: this.tecnicasAplicadas,
      avances: this.avances,
      observaciones: this.observaciones,
      proximaSesion: this.proximaSesion || null
    };

    this.penalService.createNota(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarToast('Nota guardada correctamente', 'ok');
        this.limpiarFormulario();
        this.cargarNotas();
        this.vistaActiva = 'historial';
      },
      error: (err) => {
        this.guardando = false;
        if (err.status === 409) this.mostrarToast(err.error?.message || 'Ya existe esa sesión', 'error');
        else this.mostrarToast('Error al guardar la nota', 'error');
      }
    });
  }

  // ─── EDITAR ─────────────────────────────────────────────────
  iniciarEdicion() {
    if (!this.notaSeleccionada || !this.puedeEditar) return;
    this.modoEdicion = true;
  }

  guardarEdicion() {
    if (!this.notaSeleccionada) return;
    this.guardando = true;

    const payload: any = {
      fecha: this.notaSeleccionada.fecha?.slice(0, 10),
      numeroSesion: this.notaSeleccionada.numeroSesion,
      objetivoSesion: this.notaSeleccionada.objetivoSesion,
      descripcionSesion: this.notaSeleccionada.descripcionSesion,
      tecnicasAplicadas: this.notaSeleccionada.tecnicasAplicadas,
      avances: this.notaSeleccionada.avances,
      observaciones: this.notaSeleccionada.observaciones,
      proximaSesion: this.notaSeleccionada.proximaSesion?.slice(0, 10) || null
    };

    this.penalService.updateNota(this.notaSeleccionada.id, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.modoEdicion = false;
        this.mostrarToast('Nota actualizada', 'ok');
        this.cargarNotas();
      },
      error: () => { this.guardando = false; this.mostrarToast('Error al actualizar', 'error'); }
    });
  }

  cancelarEdicion() { this.modoEdicion = false; this.cargarNotas(); }

  // ─── ELIMINAR ───────────────────────────────────────────────
  eliminarNota() {
    if (!this.notaSeleccionada || !this.puedeEliminar) return;
    if (!confirm('¿Eliminar esta nota de evolución psicológica?')) return;

    this.eliminando = true;
    this.penalService.deleteNota(this.notaSeleccionada.id).subscribe({
      next: () => {
        this.eliminando = false;
        this.notaSeleccionada = null;
        this.mostrarToast('Nota eliminada', 'ok');
        this.cargarNotas();
      },
      error: () => { this.eliminando = false; this.mostrarToast('Error al eliminar', 'error'); }
    });
  }

  // ─── PDF (Desde Backend) ─────────────────────────────
  descargarPdf(id: number) {
    this.descargandoPdf = true;
    console.log('📄 Solicitando PDF de nota ID:', id);

    this.penalService.getNotaEvolucionPdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NOTA_EVOLUCION_${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.descargandoPdf = false;
        this.mostrarToast('PDF descargado con éxito', 'ok');
      },
      error: (err) => {
        console.error('❌ Error al obtener PDF:', err);
        this.descargandoPdf = false;
        this.mostrarToast('Error al generar el PDF en el servidor', 'error');
      }
    });
  }

  // ─── UTILIDADES ─────────────────────────────────────────────
  limpiarFormulario() {
    this.fecha = '';
    this.numeroSesion = null;
    this.objetivoSesion = '';
    this.descripcionSesion = '';
    this.tecnicasAplicadas = '';
    this.avances = '';
    this.observaciones = '';
    this.proximaSesion = '';
    this.errores = {};
    this.submitted = false;
  }

  formatFecha(v: any): string {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'warn' | 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  volver() {
    this.router.navigate(['/detalle-penal', this.expediente?.id]);
  }

  private _parseUserId(): number | null {
    try {
      const token = localStorage.getItem('access_token') ?? localStorage.getItem('token') ?? sessionStorage.getItem('access_token') ?? sessionStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.sub ?? payload?.id ?? payload?.userId ?? null;
    } catch { return null; }
  }
}
