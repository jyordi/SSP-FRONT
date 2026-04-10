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

  // ─── PDF LOCAL ──────────────────────────────────────────────
  descargarPdf() {
    if (!this.notaSeleccionada) return;
    this.descargandoPdf = true;

    const n = this.notaSeleccionada;
    const exp = this.expediente || {};
    const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (m: string) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m] || m));
    const fmt = (v: any) => {
      if (!v) return '—';
      const d = new Date(v);
      return isNaN(d.getTime()) ? String(v) : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Nota de Evolución Psicológica — ${esc(n.numeroSesion)}</title>
<style>
@page{size:Letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:21.59cm;font-family:'Times New Roman',Times,serif;font-size:10pt;color:#000;line-height:1.25;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pagina{position:relative;width:21.59cm;padding:1.8cm 2cm 1.5cm 2.2cm}
.header-text{text-align:center;font-weight:bold;font-size:9pt;color:#777;margin-top:1.2cm;margin-bottom:5pt;line-height:1.2;padding-right:1.2cm}
.doc-title{text-align:center;font-size:14pt;font-weight:bold;margin-top:10pt;margin-bottom:2pt}
.exp-num{text-align:right;font-weight:bold;font-size:10pt;margin-bottom:2pt;padding-right:1.2cm}
.session-block{width:100%;margin-top:15pt;margin-bottom:20pt;page-break-inside:avoid;padding-right:1.2cm}
.data-table{width:100%;border-collapse:collapse;table-layout:fixed}
.data-table td{border:1px solid #000;padding:3pt 5pt;vertical-align:top;font-size:9pt}
.label{font-weight:bold;background-color:#f2f2f2}
@media print{body{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="pagina">
<div class="header-text">SUBSECRETARIA DE PREVENCIÓN Y REINSERCIÓN SOCIAL<br>
DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA<br>
PROGRAMA "RECONECTA CON LA PAZ"</div>
<div class="doc-title">NOTA DE EVOLUCIÓN PSICOLÓGICA</div>
<div class="exp-num">NUM. DE SESIÓN: ${esc(n.numeroSesion)}</div>

<div style="padding-right:1.2cm;">
<table class="data-table" style="margin-bottom:5pt;">
<tr><td class="label" style="width:25%;">BENEFICIARIO:</td><td style="width:45%;">${esc(exp.beneficiario?.nombre || '—')}</td><td class="label" style="width:10%;">C. PENAL:</td><td style="width:20%;">${esc(exp.cPenal || '—')}</td></tr>
<tr><td class="label">FECHA:</td><td>${fmt(n.fecha)}</td><td class="label">PSICÓLOGO:</td><td>${esc(n.psicologo?.nombre || '—')}</td></tr>
</table>

<div class="session-block">
<table class="data-table">
<tr><td class="label" style="width:30%;">OBJETIVO DE LA SESIÓN:</td><td>${esc(n.objetivoSesion || '—')}</td></tr>
<tr><td class="label">DESCRIPCIÓN DE LA SESIÓN:</td><td style="height:60pt;vertical-align:top;">${esc(n.descripcionSesion || '—')}</td></tr>
<tr><td class="label">TÉCNICAS APLICADAS:</td><td style="height:40pt;vertical-align:top;">${esc(n.tecnicasAplicadas || '—')}</td></tr>
</table></div>

<div class="session-block">
<table class="data-table">
<tr><td class="label" style="width:30%;">AVANCES PERCIBIDOS:</td><td style="height:50pt;vertical-align:top;">${esc(n.avances || '—')}</td></tr>
<tr><td class="label">OBSERVACIONES:</td><td style="height:50pt;vertical-align:top;">${esc(n.observaciones || '—')}</td></tr>
<tr><td class="label">PRÓXIMA SESIÓN:</td><td>${fmt(n.proximaSesion)}</td></tr>
</table></div>

<div style="margin-top:50pt;text-align:center;padding-right:1.2cm;">
<div style="font-weight:bold;font-size:9pt;">${esc(n.psicologo?.nombre || '—')}</div>
<div style="margin-top:4pt;border-top:1px solid #000;width:300px;margin-left:auto;margin-right:auto;padding-top:3pt;font-size:8.5pt;">Psicólogo Responsable</div>
</div>
</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 400);
      this.descargandoPdf = false;
      this.mostrarToast('PDF listo para imprimir/guardar', 'ok');
    } else {
      this.descargandoPdf = false;
      this.mostrarToast('Permite ventanas emergentes en tu navegador', 'warn');
    }
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
