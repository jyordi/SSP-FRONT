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
  generandoPdf = false;
  editandoId: number | null = null;

  vistaActiva: 'formulario' | 'historial' = 'historial';
  seccionAbierta: string | null = 'datos';

  historial: any[] = [];
  loadingHistorial = false;
  registroSeleccionado: any = null;

  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── Formulario (campos del JSON backend) ──────────────────
  fechaEstudio = '';
  opinionPrograma = '';
  diagnosticoSocial = '';

  // seccionesJsonb – datos personales
  nombre = '';
  edad = '';
  fechaNacimiento = '';
  originario = '';
  telefono = '';
  escolaridad = '';
  estadoCivil = '';
  ocupacion = '';
  domicilioActual = '';
  nacionalidad = '';
  religion = '';

  // seccionesJsonb – situación jurídica
  delito = '';
  expedientePenal = '';
  juzgado = '';
  fechaDetencion = '';

  // seccionesJsonb – familia (tabla simple)
  familiares: { nombre: string; parentesco: string; edad: string; ocupacion: string }[] = [
    { nombre: '', parentesco: '', edad: '', ocupacion: '' },
    { nombre: '', parentesco: '', edad: '', ocupacion: '' },
    { nombre: '', parentesco: '', edad: '', ocupacion: '' },
    { nombre: '', parentesco: '', edad: '', ocupacion: '' },
  ];

  // seccionesJsonb – situación económica
  ingresosMensuales = '';
  egresosMensuales = '';
  responsableManutension = '';
  caracteristicasVivienda = '';
  serviciosPublicos = '';

  // seccionesJsonb – observaciones
  observaciones = '';

  readonly ESTATUS_OPCIONES = ['FAVORABLE', 'NO FAVORABLE', 'PENDIENTE'];
  readonly SECCIONES = [
    { id: 'datos', titulo: 'Datos Personales', icono: '👤' },
    { id: 'juridica', titulo: 'Situación Jurídica', icono: '⚖️' },
    { id: 'familia', titulo: 'Núcleo Familiar', icono: '👨‍👩‍👧' },
    { id: 'economica', titulo: 'Situación Económica', icono: '💰' },
    { id: 'opinion', titulo: 'Opinión y Diagnóstico', icono: '📋' },
  ];

  // ─── Roles ─────────────────────────────────────────────────
  get role() { return this.session.getRole(); }
  get esAdmin() { return this.role === 'admin'; }
  get esTrabajoSocial() { return this.role === 'trabajo_social'; }
  get esPsicologo() { return this.role === 'psicologo'; }
  get esGuia() { return this.role === 'guia'; }
  get puedeCrear() { return this.esAdmin || this.esTrabajoSocial; }
  get puedeEditar() { return this.esAdmin || this.esTrabajoSocial; }
  get puedeEliminar() { return this.esAdmin; }

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
    this.nombre = this.expediente?.beneficiario?.nombre || '';
    this.delito = this.expediente?.delito || '';
    this.juzgado = this.expediente?.juzgado || '';
    this.expedientePenal = this.expediente?.folioExpediente || '';
    this.fechaDetencion = this.expediente?.fechaIngreso || '';
    this.ocupacion = this.expediente?.beneficiario?.ocupacion || '';
    this.fechaEstudio = new Date().toISOString().split('T')[0];
  }

  // ─── Edad automática ──────────────────────────────────────
  calcularEdad() {
    if (!this.fechaNacimiento) return;
    const hoy = new Date();
    const nac = new Date(this.fechaNacimiento);
    if (isNaN(nac.getTime())) return;
    let e = hoy.getFullYear() - nac.getFullYear();
    const dm = hoy.getMonth() - nac.getMonth();
    if (dm < 0 || (dm === 0 && hoy.getDate() < nac.getDate())) e--;
    if (e >= 0 && e < 120) this.edad = String(e);
  }

  // ─── Secciones colapsables ────────────────────────────────
  toggleSeccion(id: string) {
    this.seccionAbierta = this.seccionAbierta === id ? null : id;
  }

  agregarFamiliar() {
    this.familiares.push({ nombre: '', parentesco: '', edad: '', ocupacion: '' });
  }

  eliminarFamiliar(i: number) {
    if (this.familiares.length > 1) this.familiares.splice(i, 1);
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
    if (!this.nombre?.trim()) this.errores['nombre'] = 'El nombre es obligatorio';
    return Object.keys(this.errores).length === 0;
  }

  // ─── Guardar / Actualizar ─────────────────────────────────
  guardar() {
    this.submitted = true;
    if (!this.validar()) { this.mostrarToast('Completa los campos obligatorios', 'error'); return; }
    if (!this.expediente?.id) return;

    this.guardando = true;

    const seccionesJsonb = {
      datos_personales: {
        nombre: this.nombre, edad: this.edad, fechaNacimiento: this.fechaNacimiento,
        originario: this.originario, telefono: this.telefono, escolaridad: this.escolaridad,
        estadoCivil: this.estadoCivil, ocupacion: this.ocupacion,
        domicilioActual: this.domicilioActual, nacionalidad: this.nacionalidad, religion: this.religion,
      },
      situacion_juridica: {
        delito: this.delito, expedientePenal: this.expedientePenal,
        juzgado: this.juzgado, fechaDetencion: this.fechaDetencion,
      },
      nucleo_familiar: { miembros: this.familiares.filter(f => f.nombre?.trim()) },
      situacion_economica: {
        ingresosMensuales: this.ingresosMensuales, egresosMensuales: this.egresosMensuales,
        responsableManutension: this.responsableManutension,
        caracteristicasVivienda: this.caracteristicasVivienda, serviciosPublicos: this.serviciosPublicos,
      },
      observaciones: this.observaciones,
    };

    if (this.editandoId) {
      const payload = { fechaEstudio: this.fechaEstudio, seccionesJsonb, opinionPrograma: this.opinionPrograma, diagnosticoSocial: this.diagnosticoSocial };
      this.penalService.updateTrabajoSocial(this.editandoId, payload).subscribe({
        next: () => { this.guardando = false; this.editandoId = null; this.mostrarToast('Estudio actualizado', 'ok'); this.limpiar(); this.cargarHistorial(); this.vistaActiva = 'historial'; },
        error: (e) => { this.guardando = false; this.mostrarToast(e?.error?.message || 'Error al actualizar', 'error'); }
      });
    } else {
      const payload = {
        expedienteId: this.expediente.id,
        trabajadorSocialId: this.session.getUserId(),
        fechaEstudio: this.fechaEstudio, seccionesJsonb,
        opinionPrograma: this.opinionPrograma, diagnosticoSocial: this.diagnosticoSocial,
      };
      this.penalService.saveTrabajoSocial(payload).subscribe({
        next: () => { this.guardando = false; this.mostrarToast('Estudio guardado', 'ok'); this.limpiar(); this.cargarHistorial(); this.vistaActiva = 'historial'; },
        error: (e) => { this.guardando = false; this.mostrarToast(e.status === 409 ? 'Ya existe un estudio para este expediente' : 'Error al guardar', 'error'); }
      });
    }
  }

  // ─── Editar ───────────────────────────────────────────────
  editar(item: any) {
    if (!this.puedeEditar) { this.mostrarToast('Sin permiso para editar', 'error'); return; }
    this.editandoId = item.id;
    const s = item.seccionesJsonb || {};
    const dp = s.datos_personales || s.datos_generales || {};
    const sj = s.situacion_juridica || {};
    const nf = s.nucleo_familiar || s.nucleo_familiar_primario || {};
    const se = s.situacion_economica || {};

    this.fechaEstudio = item.fechaEstudio?.slice(0, 10) || '';
    this.opinionPrograma = item.opinionPrograma || '';
    this.diagnosticoSocial = item.diagnosticoSocial || '';
    this.observaciones = s.observaciones || '';

    this.nombre = dp.nombre || ''; this.edad = dp.edad || '';
    this.fechaNacimiento = dp.fechaNacimiento || ''; this.originario = dp.originario || '';
    this.telefono = dp.telefono || ''; this.escolaridad = dp.escolaridad || '';
    this.estadoCivil = dp.estadoCivil || ''; this.ocupacion = dp.ocupacion || '';
    this.domicilioActual = dp.domicilioActual || ''; this.nacionalidad = dp.nacionalidad || '';
    this.religion = dp.religion || '';

    this.delito = sj.delito || ''; this.expedientePenal = sj.expedientePenal || '';
    this.juzgado = sj.juzgado || ''; this.fechaDetencion = sj.fechaDetencion || '';

    this.familiares = Array.isArray(nf.miembros) && nf.miembros.length
      ? nf.miembros.map((m: any) => ({ nombre: m.nombre || '', parentesco: m.parentesco || '', edad: m.edad || '', ocupacion: m.ocupacion || '' }))
      : [{ nombre: '', parentesco: '', edad: '', ocupacion: '' }];

    this.ingresosMensuales = se.ingresosMensuales || ''; this.egresosMensuales = se.egresosMensuales || '';
    this.responsableManutension = se.responsableManutension || '';
    this.caracteristicasVivienda = se.caracteristicasVivienda || ''; this.serviciosPublicos = se.serviciosPublicos || '';

    this.vistaActiva = 'formulario';
    this.seccionAbierta = 'datos';
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
      next: () => { this.eliminando = false; this.registroSeleccionado = null; this.mostrarToast('Eliminado', 'ok'); this.cargarHistorial(); },
      error: () => { this.eliminando = false; this.mostrarToast('Error al eliminar', 'error'); }
    });
  }

  // ─── PDF Local ────────────────────────────────────────────
  descargarPdf(item?: any) {
    const d = item || this.registroSeleccionado;
    if (!d) return;
    this.generandoPdf = true;
    const s = d.seccionesJsonb || {};
    const dp = s.datos_personales || s.datos_generales || {};
    const sj = s.situacion_juridica || {};
    const se = s.situacion_economica || {};
    const nf = s.nucleo_familiar || s.nucleo_familiar_primario || {};
    const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, (m: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m] || m));
    const fmt = (v: any) => { if (!v) return '—'; const dt = new Date(v); return isNaN(dt.getTime()) ? String(v) : dt.toLocaleDateString('es-MX'); };

    const famRows = (nf.miembros || []).map((m: any) =>
      `<tr><td>${esc(m.nombre)}</td><td>${esc(m.parentesco)}</td><td>${esc(m.edad)}</td><td>${esc(m.ocupacion)}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Estudio Trabajo Social</title>
<style>@page{size:Letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:21.59cm;font-family:'Times New Roman',Times,serif;font-size:10pt;color:#000;line-height:1.3}
.pagina{width:21.59cm;padding:1.8cm 2cm 1.5cm 2.2cm}
.header-text{text-align:center;font-weight:bold;font-size:9pt;color:#777;margin-top:1.2cm;margin-bottom:8pt;line-height:1.2}
.doc-title{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:12pt}
table.dt{width:100%;border-collapse:collapse;margin-bottom:8pt}
table.dt td{border:1px solid #000;padding:3pt 5pt;font-size:9pt;vertical-align:top}
td.lbl{font-weight:bold;background:#f2f2f2;width:30%}
.sig{margin-top:40pt;text-align:center}
.sig-line{border-top:1px solid #000;width:260px;margin:0 auto;padding-top:3pt;font-size:8.5pt}
</style></head><body>
<div class="pagina">
<div class="header-text">SUBSECRETARIA DE PREVENCIÓN Y REINSERCIÓN SOCIAL<br>
DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA<br>
PROGRAMA "RECONECTA CON LA PAZ"</div>
<div class="doc-title">ESTUDIO DE TRABAJO SOCIAL</div>
<table class="dt"><tr><td class="lbl">NOMBRE:</td><td>${esc(dp.nombre)}</td><td class="lbl">EDAD:</td><td>${esc(dp.edad)}</td></tr>
<tr><td class="lbl">FECHA:</td><td>${fmt(d.fechaEstudio)}</td><td class="lbl">ESTADO CIVIL:</td><td>${esc(dp.estadoCivil)}</td></tr>
<tr><td class="lbl">ORIGINARIO:</td><td>${esc(dp.originario)}</td><td class="lbl">ESCOLARIDAD:</td><td>${esc(dp.escolaridad)}</td></tr>
<tr><td class="lbl">OCUPACIÓN:</td><td>${esc(dp.ocupacion)}</td><td class="lbl">TELÉFONO:</td><td>${esc(dp.telefono)}</td></tr>
<tr><td class="lbl">DOMICILIO:</td><td colspan="3">${esc(dp.domicilioActual)}</td></tr></table>
<table class="dt"><tr><td class="lbl">DELITO:</td><td>${esc(sj.delito)}</td></tr>
<tr><td class="lbl">EXPEDIENTE:</td><td>${esc(sj.expedientePenal)}</td></tr>
<tr><td class="lbl">JUZGADO:</td><td>${esc(sj.juzgado)}</td></tr></table>
${famRows ? `<table class="dt"><tr><td class="lbl">NOMBRE</td><td class="lbl">PARENTESCO</td><td class="lbl">EDAD</td><td class="lbl">OCUPACIÓN</td></tr>${famRows}</table>` : ''}
<table class="dt"><tr><td class="lbl">INGRESOS:</td><td>${esc(se.ingresosMensuales)}</td><td class="lbl">EGRESOS:</td><td>${esc(se.egresosMensuales)}</td></tr>
<tr><td class="lbl">VIVIENDA:</td><td colspan="3">${esc(se.caracteristicasVivienda)}</td></tr></table>
<table class="dt"><tr><td class="lbl">OPINIÓN:</td><td>${esc(d.opinionPrograma)}</td></tr>
<tr><td class="lbl">DIAGNÓSTICO:</td><td style="font-weight:bold;color:#850a31">${esc(d.diagnosticoSocial || 'FAVORABLE')}</td></tr>
<tr><td class="lbl">OBSERVACIONES:</td><td>${esc(s.observaciones)}</td></tr></table>
<div class="sig"><div style="font-weight:bold;font-size:9pt;">${esc(d.trabajadorSocial?.nombre || '—')}</div>
<div class="sig-line">Trabajador Social Responsable</div></div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
    this.generandoPdf = false;
    this.mostrarToast('PDF listo', 'ok');
  }

  // ─── Utilidades ───────────────────────────────────────────
  limpiar() {
    this.fechaEstudio = new Date().toISOString().split('T')[0];
    this.opinionPrograma = ''; this.diagnosticoSocial = ''; this.observaciones = '';
    this.nombre = ''; this.edad = ''; this.fechaNacimiento = ''; this.originario = '';
    this.telefono = ''; this.escolaridad = ''; this.estadoCivil = ''; this.ocupacion = '';
    this.domicilioActual = ''; this.nacionalidad = ''; this.religion = '';
    this.delito = ''; this.expedientePenal = ''; this.juzgado = ''; this.fechaDetencion = '';
    this.ingresosMensuales = ''; this.egresosMensuales = ''; this.responsableManutension = '';
    this.caracteristicasVivienda = ''; this.serviciosPublicos = '';
    this.familiares = [{ nombre: '', parentesco: '', edad: '', ocupacion: '' }];
    this.errores = {}; this.submitted = false;
  }

  formatFecha(v: any): string {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getNombreEstudio(item: any): string {
    const s = item?.seccionesJsonb || {};
    return s.datos_personales?.nombre || s.datos_generales?.nombre || 'Sin nombre';
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'warn' | 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  volver() {
    this.router.navigate(['/detalle-penal', this.expediente?.id]);
  }
}