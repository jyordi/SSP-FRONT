/**
 * Incidencias Penales — Componente CRUD
 * Endpoint: /penal/incidencias
 * Roles: admin, guia, psicologo, trabajo_social (CRUD)
 *        admin only (delete)
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  selector: 'app-incidencias-penal',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './incidencias-penal.component.html',
  styleUrls: ['./incidencias-penal.component.css'],
})
export class IncidenciasPenalComponent implements OnInit {

  private router = inject(Router);
  private penalService = inject(PenalService);
  private session = inject(SessionService);

  // ─── Estado ────────────────────────────────────────────────
  expediente: any = null;
  loading = true;
  guardando = false;
  eliminando = false;
  generandoPdf = false;
  editandoId: number | null = null;

  vistaActiva: 'lista' | 'formulario' = 'lista';
  incidencias: any[] = [];
  loadingList = false;
  seleccionada: any = null;

  toast: { msg: string; tipo: 'ok' | 'error' | 'info' } | null = null;
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── Formulario ────────────────────────────────────────────
  fecha = '';
  tipo = '';
  gravedad = 'MEDIA';
  descripcion = '';
  accionesTomadas = '';
  observaciones = '';
  reincidencia = false;
  estatus = 'ACTIVA';

  // ─── Enums ─────────────────────────────────────────────────
  readonly TIPOS = [
    { value: 'INASISTENCIA',       label: 'Inasistencia',        icon: '🚫' },
    { value: 'INCUMPLIMIENTO',     label: 'Incumplimiento',      icon: '⚠️' },
    { value: 'CONDUCTA_INADECUADA',label: 'Conducta Inadecuada', icon: '🔴' },
    { value: 'DESACATO',           label: 'Desacato',            icon: '❗' },
    { value: 'OBSERVACION',        label: 'Observación',         icon: '👁️' },
    { value: 'OTRA',               label: 'Otra',                icon: '📌' },
  ];

  readonly GRAVEDADES = [
    { value: 'BAJA',  label: 'Baja',  color: '#2d6a4f' },
    { value: 'MEDIA', label: 'Media', color: '#b45309' },
    { value: 'ALTA',  label: 'Alta',  color: '#8b0000' },
  ];

  readonly ESTATUS_OPTS = [
    { value: 'ACTIVA',   label: 'Activa',   icon: '🔴' },
    { value: 'ATENDIDA', label: 'Atendida', icon: '🟡' },
    { value: 'CERRADA',  label: 'Cerrada',  icon: '🟢' },
  ];

  // ─── Roles ─────────────────────────────────────────────────
  get role() { return this.session.getRole(); }
  get esAdmin() { return this.role === 'admin'; }
  get esGuia() { return this.role === 'guia'; }
  get esPsicologo() { return this.role === 'psicologo'; }
  get esTrabajoSocial() { return this.role === 'trabajo_social'; }
  get puedeCrear() { return this.esAdmin || this.esGuia || this.esPsicologo || this.esTrabajoSocial; }
  get puedeEditar() { return this.puedeCrear; }
  get puedeEliminar() { return this.esAdmin; }

  // ─── Stats ─────────────────────────────────────────────────
  get totalActivas() { return this.incidencias.filter(i => i.estatus === 'ACTIVA').length; }
  get totalAtendidas() { return this.incidencias.filter(i => i.estatus === 'ATENDIDA').length; }
  get totalCerradas() { return this.incidencias.filter(i => i.estatus === 'CERRADA').length; }
  get totalAltas() { return this.incidencias.filter(i => i.gravedad === 'ALTA').length; }

  // ─── Init ──────────────────────────────────────────────────
  ngOnInit() {
    const nav = history.state;
    if (nav?.expediente) {
      this.expediente = nav.expediente;
      sessionStorage.setItem('expediente', JSON.stringify(nav.expediente));
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) { try { this.expediente = JSON.parse(raw); } catch {} }
    }

    if (this.expediente?.id) {
      this.loading = false;
      this.cargarIncidencias();
    } else {
      this.loading = false;
      this.mostrarToast('No se encontró el expediente', 'error');
    }
  }

  // ─── Cargar ────────────────────────────────────────────────
  cargarIncidencias() {
    if (!this.expediente?.id) return;
    this.loadingList = true;
    this.penalService.getIncidenciasByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.incidencias = Array.isArray(data) ? data : [];
        this.loadingList = false;
        if (this.incidencias.length && !this.seleccionada) {
          this.seleccionar(this.incidencias[0]);
        }
      },
      error: () => { this.incidencias = []; this.loadingList = false; }
    });
  }

  seleccionar(item: any) { this.seleccionada = item; }

  // ─── Validar ──────────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.fecha) this.errores['fecha'] = 'La fecha es obligatoria';
    if (!this.tipo) this.errores['tipo'] = 'Selecciona un tipo';
    if (!this.descripcion?.trim()) this.errores['descripcion'] = 'La descripción es obligatoria';
    return Object.keys(this.errores).length === 0;
  }

  // ─── Guardar / Actualizar ─────────────────────────────────
  guardar() {
    this.submitted = true;
    if (!this.validar()) { this.mostrarToast('Completa los campos obligatorios', 'error'); return; }

    this.guardando = true;
    const payload: any = {
      fecha: this.fecha,
      tipo: this.tipo,
      gravedad: this.gravedad,
      descripcion: this.descripcion,
      accionesTomadas: this.accionesTomadas || undefined,
      observaciones: this.observaciones || undefined,
      reincidencia: this.reincidencia,
      estatus: this.estatus,
    };

    if (this.editandoId) {
      this.penalService.updateIncidencia(this.editandoId, payload).subscribe({
        next: () => {
          this.guardando = false; this.editandoId = null;
          this.mostrarToast('Incidencia actualizada', 'ok');
          this.limpiar(); this.cargarIncidencias(); this.vistaActiva = 'lista';
        },
        error: (e) => { this.guardando = false; this.mostrarToast(e?.error?.message || 'Error al actualizar', 'error'); }
      });
    } else {
      payload.expedienteId = this.expediente.id;
      payload.registradoPorId = this.session.getUserId();
      this.penalService.createIncidencia(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarToast('Incidencia registrada', 'ok');
          this.limpiar(); this.cargarIncidencias(); this.vistaActiva = 'lista';
        },
        error: (e) => { this.guardando = false; this.mostrarToast(e?.error?.message || 'Error al guardar', 'error'); }
      });
    }
  }

  // ─── Editar ───────────────────────────────────────────────
  editar(item: any) {
    if (!this.puedeEditar) { this.mostrarToast('Sin permiso para editar', 'error'); return; }
    this.editandoId = item.id;
    this.fecha = item.fecha?.slice(0, 10) || '';
    this.tipo = item.tipo || '';
    this.gravedad = item.gravedad || 'MEDIA';
    this.descripcion = item.descripcion || '';
    this.accionesTomadas = item.accionesTomadas || '';
    this.observaciones = item.observaciones || '';
    this.reincidencia = item.reincidencia ?? false;
    this.estatus = item.estatus || 'ACTIVA';
    this.vistaActiva = 'formulario';
    this.mostrarToast('✏️ Cargada para editar', 'info');
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.limpiar();
    this.vistaActiva = 'lista';
    this.mostrarToast('Edición cancelada', 'info');
  }

  // ─── Eliminar ─────────────────────────────────────────────
  eliminarIncidencia(id: number) {
    if (!this.puedeEliminar) { this.mostrarToast('Solo admin puede eliminar', 'error'); return; }
    if (!confirm('¿Eliminar esta incidencia?')) return;
    this.eliminando = true;
    this.penalService.deleteIncidencia(id).subscribe({
      next: () => { this.eliminando = false; this.seleccionada = null; this.mostrarToast('Eliminada', 'ok'); this.cargarIncidencias(); },
      error: () => { this.eliminando = false; this.mostrarToast('Error al eliminar', 'error'); }
    });
  }

  // ─── PDF Local ────────────────────────────────────────────
  descargarPdf(item?: any) {
    const d = item || this.seleccionada;
    if (!d) return;
    this.generandoPdf = true;
    const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] || c));
    const fmt = (v: any) => { if (!v) return '—'; const dt = new Date(v); return isNaN(dt.getTime()) ? String(v) : dt.toLocaleDateString('es-MX'); };
    const gravColor = d.gravedad === 'ALTA' ? '#8b0000' : d.gravedad === 'MEDIA' ? '#b45309' : '#2d6a4f';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Incidencia Penal</title>
<style>@page{size:Letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:21.59cm;font-family:'Times New Roman',Times,serif;font-size:10pt;color:#000;line-height:1.4}
.pagina{width:21.59cm;padding:1.8cm 2cm 1.5cm 2.2cm}
.header{text-align:center;font-weight:bold;font-size:9pt;color:#777;margin-top:1.2cm;margin-bottom:8pt;line-height:1.2}
.titulo{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:14pt;color:#850a31}
table.dt{width:100%;border-collapse:collapse;margin-bottom:10pt}
table.dt td{border:1px solid #000;padding:4pt 6pt;font-size:9.5pt;vertical-align:top}
td.lbl{font-weight:bold;background:#f2f2f2;width:28%}
.badge{display:inline-block;padding:2pt 8pt;border-radius:4pt;font-weight:bold;font-size:8.5pt;color:#fff}
.sig{margin-top:50pt;text-align:center}
.sig-line{border-top:1px solid #000;width:260px;margin:0 auto;padding-top:4pt;font-size:8.5pt}
</style></head><body>
<div class="pagina">
<div class="header">SUBSECRETARÍA DE PREVENCIÓN Y REINSERCIÓN SOCIAL<br>
DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA<br>
PROGRAMA "RECONECTA CON LA PAZ"</div>
<div class="titulo">REPORTE DE INCIDENCIA</div>
<table class="dt">
<tr><td class="lbl">EXPEDIENTE:</td><td>#${d.expediente?.id || this.expediente?.id || '—'}</td>
<td class="lbl">FECHA:</td><td>${fmt(d.fecha)}</td></tr>
<tr><td class="lbl">BENEFICIARIO:</td><td colspan="3">${esc(d.expediente?.beneficiario?.nombre || this.expediente?.beneficiario?.nombre || '—')}</td></tr>
<tr><td class="lbl">TIPO:</td><td>${esc(d.tipo)}</td>
<td class="lbl">GRAVEDAD:</td><td><span class="badge" style="background:${gravColor}">${esc(d.gravedad)}</span></td></tr>
<tr><td class="lbl">ESTATUS:</td><td>${esc(d.estatus)}</td>
<td class="lbl">REINCIDENCIA:</td><td>${d.reincidencia ? 'SÍ' : 'NO'}</td></tr>
</table>
<table class="dt">
<tr><td class="lbl">DESCRIPCIÓN:</td><td>${esc(d.descripcion)}</td></tr>
<tr><td class="lbl">ACCIONES TOMADAS:</td><td>${esc(d.accionesTomadas)}</td></tr>
<tr><td class="lbl">OBSERVACIONES:</td><td>${esc(d.observaciones)}</td></tr>
</table>
<table class="dt">
<tr><td class="lbl">REGISTRADO POR:</td><td>${esc(d.registradoPor?.nombre || '—')}</td>
<td class="lbl">FECHA REGISTRO:</td><td>${fmt(d.createdAt)}</td></tr>
</table>
<div class="sig"><div class="sig-line">Firma del Responsable</div></div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
    this.generandoPdf = false;
    this.mostrarToast('PDF listo', 'ok');
  }

  // ─── Utilidades ───────────────────────────────────────────
  limpiar() {
    this.fecha = new Date().toISOString().split('T')[0];
    this.tipo = ''; this.gravedad = 'MEDIA'; this.descripcion = '';
    this.accionesTomadas = ''; this.observaciones = '';
    this.reincidencia = false; this.estatus = 'ACTIVA';
    this.errores = {}; this.submitted = false;
  }

  nuevoFormulario() {
    if (!this.puedeCrear) { this.mostrarToast('Sin permiso', 'error'); return; }
    this.editandoId = null;
    this.limpiar();
    this.vistaActiva = 'formulario';
  }

  formatFecha(v: any): string {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getTipoLabel(val: string): string {
    return this.TIPOS.find(t => t.value === val)?.label || val;
  }
  getTipoIcon(val: string): string {
    return this.TIPOS.find(t => t.value === val)?.icon || '📌';
  }
  getGravedadColor(val: string): string {
    return this.GRAVEDADES.find(g => g.value === val)?.color || '#666';
  }
  getEstatusIcon(val: string): string {
    return this.ESTATUS_OPTS.find(e => e.value === val)?.icon || '⚪';
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  volver() {
    this.router.navigate(['/detalle-penal', this.expediente?.id]);
  }
}
