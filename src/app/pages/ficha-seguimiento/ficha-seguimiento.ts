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
  templateUrl: './ficha-seguimiento.html',
  styleUrls: ['./ficha-seguimiento.css']
})
export class FichaSeguimientoComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';
  userId = 0;

  // ─── VISTA ────────────────────────────────────────────────
  vistaActiva: 'nueva' | 'historial' = 'nueva';

  // ─── HISTORIAL ────────────────────────────────────────────
  fichas: any[] = [];
  loadingFichas = false;
  fichaSeleccionada: any = null;
  modoEdicion = false;
  eliminando = false;
  descargandoPdf = false;

  // ─── TOAST ────────────────────────────────────────────────
  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;

  // ─── VALIDACIÓN ───────────────────────────────────────────
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── FORMULARIO ───────────────────────────────────────────
  fecha = '';
  periodo = '';
  datosPersonalesJsonb: any = { nombre: '', telefono: '', domicilio: '' };
  cumplimientoGeneral = '';
  comportamiento = '';
  observaciones = '';
  incidenciasJsonb: any = { inasistencias: 0, incumplimientos: 0, observaciones: [] };
  nuevaIncidenciaObs = '';
  recomendaciones = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private penalService: PenalService,
    private session: SessionService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    this.userId = this.session.getUserId();
    console.log('👤 Rol:', this.role, '| UserId:', this.userId);

    if (history.state?.expediente) {
      this.expediente = history.state.expediente;
      this.initForm();
    } else {
      const expStr = sessionStorage.getItem('expediente');
      if (expStr) {
        this.expediente = JSON.parse(expStr);
        this.initForm();
      } else {
        this.mostrarToast('No se encontró el expediente', 'error');
        this.router.navigate(['/expedientes']);
      }
    }
  }

  // ─── INIT ─────────────────────────────────────────────────
  initForm() {
    this.fecha = new Date().toISOString().split('T')[0];
    const d = new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    this.periodo = `${meses[d.getMonth()]} ${d.getFullYear()}`;

    if (this.expediente?.beneficiario) {
      const b = this.expediente.beneficiario;
      this.datosPersonalesJsonb.nombre = b.nombre || '';
      this.datosPersonalesJsonb.telefono = b.telefono || '';
      const dom: string[] = [];
      if (b.calle) dom.push(b.calle);
      if (b.numExterior) dom.push(`Ext. ${b.numExterior}`);
      if (b.numInterior) dom.push(`Int. ${b.numInterior}`);
      if (b.colonia) dom.push(`Col. ${b.colonia}`);
      if (b.municipio) dom.push(b.municipio);
      this.datosPersonalesJsonb.domicilio = dom.join(', ');
    }
    this.loading = false;
    console.log('📋 Expediente cargado:', this.expediente);
  }

  // ─── TOAST ────────────────────────────────────────────────
  mostrarToast(msg: string, tipo: 'ok' | 'error' | 'warn' | 'info' = 'info') {
    this.toast = { msg, tipo };
    setTimeout(() => { this.toast = null; }, 3500);
  }

  // ─── VALIDACIÓN ───────────────────────────────────────────
  validarFormulario(): boolean {
    this.errores = {};
    if (!this.fecha) this.errores['fecha'] = 'La fecha es obligatoria';
    if (!this.periodo || !this.periodo.trim()) this.errores['periodo'] = 'El periodo es obligatorio';
    if (!this.cumplimientoGeneral || !this.cumplimientoGeneral.trim()) this.errores['cumplimientoGeneral'] = 'El cumplimiento general es obligatorio';
    if (!this.comportamiento || !this.comportamiento.trim()) this.errores['comportamiento'] = 'El comportamiento es obligatorio';
    return Object.keys(this.errores).length === 0;
  }

  tieneError(campo: string): boolean {
    return this.submitted && !!this.errores[campo];
  }

  // ─── CAMBIAR VISTA ────────────────────────────────────────
  cambiarVista(vista: 'nueva' | 'historial') {
    this.vistaActiva = vista;
    this.fichaSeleccionada = null;
    this.modoEdicion = false;
    this.submitted = false;
    this.errores = {};
    if (vista === 'historial') this.cargarFichas();
  }

  // ─── CARGAR FICHAS ────────────────────────────────────────
  cargarFichas() {
    if (!this.expediente?.id) return;
    this.loadingFichas = true;
    this.fichaSeleccionada = null;
    this.modoEdicion = false;
    console.log('📥 Cargando fichas para expediente:', this.expediente.id);

    this.penalService.getFichasSeguimientoByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        this.fichas = Array.isArray(res) ? res : [res];
        this.loadingFichas = false;
        console.log('✅ Fichas cargadas:', this.fichas);
      },
      error: (err) => {
        this.loadingFichas = false;
        if (err.status === 404) {
          this.fichas = [];
          console.log('ℹ️ No hay fichas para este expediente');
        } else { console.error('❌ Error al cargar fichas:', err); }
      }
    });
  }

  // ─── SELECCIONAR FICHA ────────────────────────────────────
  seleccionarFicha(ficha: any) {
    this.fichaSeleccionada = JSON.parse(JSON.stringify(ficha));
    this.modoEdicion = false;
    console.log('🔍 Ficha seleccionada:', this.fichaSeleccionada);
  }
  deseleccionarFicha() { this.fichaSeleccionada = null; this.modoEdicion = false; }
  toggleEdicion() { this.modoEdicion = !this.modoEdicion; }

  // ─── ACTUALIZAR ───────────────────────────────────────────
  actualizarFicha() {
    if (!this.fichaSeleccionada?.id) return;
    this.guardando = true;
    const payload = {
      fecha: this.fichaSeleccionada.fecha,
      periodo: this.fichaSeleccionada.periodo,
      datosPersonalesJsonb: this.fichaSeleccionada.datosPersonalesJsonb,
      cumplimientoGeneral: this.fichaSeleccionada.cumplimientoGeneral,
      comportamiento: this.fichaSeleccionada.comportamiento,
      observaciones: this.fichaSeleccionada.observaciones,
      incidenciasJsonb: this.fichaSeleccionada.incidenciasJsonb,
      recomendaciones: this.fichaSeleccionada.recomendaciones,
    };
    console.log('📝 Actualizando ficha ID:', this.fichaSeleccionada.id, payload);

    this.penalService.updateFichaSeguimiento(this.fichaSeleccionada.id, payload).subscribe({
      next: (res) => {
        console.log('✅ Ficha actualizada:', res);
        this.guardando = false;
        this.modoEdicion = false;
        this.cargarFichas();
        this.mostrarToast('Ficha actualizada correctamente', 'ok');
      },
      error: (err) => {
        this.guardando = false;
        console.error('❌ Error al actualizar:', err);
        this.mostrarToast(err.status === 409 ? 'Ya existe otra ficha con ese periodo.' : 'Error al actualizar. Revisa la consola.', 'error');
      }
    });
  }

  // ─── ELIMINAR ─────────────────────────────────────────────
  eliminarFicha(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta ficha de seguimiento?')) return;
    this.eliminando = true;
    console.log('🗑️ Eliminando ficha ID:', id);

    this.penalService.deleteFichaSeguimiento(id).subscribe({
      next: () => {
        console.log('✅ Ficha eliminada ID:', id);
        this.eliminando = false;
        this.fichaSeleccionada = null;
        this.modoEdicion = false;
        this.cargarFichas();
        this.mostrarToast('Ficha eliminada correctamente', 'ok');
      },
      error: (err) => {
        this.eliminando = false;
        console.error('❌ Error al eliminar ficha:', err);
        this.mostrarToast('Error al eliminar la ficha.', 'error');
      }
    });
  }

  // ─── PDF (generado localmente) ──────────────────────────
  descargarPdf(_id: number) {
    if (!this.fichaSeleccionada) return;
    this.descargandoPdf = true;
    console.log('📄 Generando PDF local de ficha ID:', this.fichaSeleccionada.id);

    const f = this.fichaSeleccionada;
    const exp = this.expediente || {};
    const dp = f.datosPersonalesJsonb || {};
    const inc = f.incidenciasJsonb || {};

    const formatFecha = (v: any) => {
      if (!v) return '—';
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };

    // Construir filas de incidencias
    let incidenciasHtml = '';
    if (inc && typeof inc === 'object') {
      const entries = Object.entries(inc);
      if (entries.length > 0) {
        let filas = '';
        for (const [key, val] of entries) {
          const displayVal = Array.isArray(val) ? (val as string[]).join(', ') : String(val ?? '—');
          filas += `<tr><td class="label-cell">${this.escapeHtml(key.toUpperCase())}</td><td>${this.escapeHtml(displayVal)}</td></tr>`;
        }
        incidenciasHtml = `
          <div class="table-container">
            <table>
              <thead><tr><th colspan="2" style="background-color:#d9d9d9;">INCIDENCIAS REPORTADAS</th></tr></thead>
              <tbody>${filas}</tbody>
            </table>
          </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha de Seguimiento</title>
  <style>
    @page { size: Letter; margin: 0; }
    * { box-sizing:border-box; margin:0; padding:0; }
    html,body { width:21.59cm; font-family:'Times New Roman',Times,serif; font-size:11pt; color:#000; line-height:1.35; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .pagina { position:relative; width:21.59cm; padding:1.8cm 2cm 1.5cm 2.2cm; }
    .header-text { text-align:center; font-weight:bold; font-size:9pt; color:#666; margin-top:1.2cm; margin-bottom:8pt; line-height:1.3; }
    .doc-title { text-align:center; font-size:13pt; font-weight:bold; margin-top:10pt; margin-bottom:2pt; }
    .table-container { width:100%; margin-bottom:16pt; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; }
    th,td { border:1px solid #000; padding:6pt; vertical-align:top; word-wrap:break-word; font-size:10.5pt; }
    th { text-align:center; font-weight:bold; background-color:#d9d9d9; }
    .label-cell { font-weight:bold; background-color:#e8e8e8; width:25%; }
    .center { text-align:center; vertical-align:middle; }
    .firma { margin-top:40pt; text-align:center; page-break-inside:avoid; }
    .firma-linea { width:260px; margin:0 auto; border-top:1px solid #000; padding-top:5px; font-weight:bold; font-size:9pt; }
    .firma-label { font-size:8.5pt; margin-top:2pt; }
    @media print { body { -webkit-print-color-adjust:exact; } }
  </style>
</head>
<body>
<div class="pagina">
  <div class="header-text">
    SUBSECRETARIA DE PREVENCIÓN Y REINSERCIÓN SOCIAL<br>
    DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA<br>
    PROGRAMA "RECONECTA CON LA PAZ"
  </div>
  <div class="doc-title">FICHA DE SEGUIMIENTO</div>

  <div class="table-container">
    <table>
      <tr><td class="label-cell">C. PENAL:</td><td>${this.escapeHtml(exp.cPenal || '—')}</td></tr>
      <tr><td class="label-cell">EXPEDIENTE TÉCNICO:</td><td>${this.escapeHtml(exp.expedienteTecnico || '—')}</td></tr>
      <tr><td class="label-cell">FOLIO DE EXPEDIENTE:</td><td>${this.escapeHtml(exp.folioExpediente || '—')}</td></tr>
      <tr><td class="label-cell">BENEFICIARIO:</td><td>${this.escapeHtml(dp.nombre || exp.beneficiario?.nombre || '—')}</td></tr>
      <tr><td class="label-cell">GUÍA RESPONSABLE:</td><td>${this.escapeHtml(f.guia?.nombre || '—')}</td></tr>
      <tr><td class="label-cell">FECHA:</td><td>${formatFecha(f.fecha)}</td></tr>
      <tr><td class="label-cell">PERÍODO:</td><td>${this.escapeHtml(f.periodo || '—')}</td></tr>
    </table>
  </div>

  <div class="table-container">
    <table>
      <thead><tr><th colspan="2" style="background-color:#d9d9d9;">EVALUACIÓN GENERAL</th></tr></thead>
      <tbody>
        <tr><td class="label-cell">CUMPLIMIENTO GENERAL:</td><td class="center">${this.escapeHtml(f.cumplimientoGeneral || '—')}</td></tr>
        <tr><td class="label-cell">COMPORTAMIENTO:</td><td style="height:50pt;vertical-align:top;">${this.escapeHtml(f.comportamiento || '—')}</td></tr>
        <tr><td class="label-cell">OBSERVACIONES:</td><td style="height:50pt;vertical-align:top;">${this.escapeHtml(f.observaciones || '—')}</td></tr>
        <tr><td class="label-cell">RECOMENDACIONES:</td><td style="height:50pt;vertical-align:top;">${this.escapeHtml(f.recomendaciones || '—')}</td></tr>
      </tbody>
    </table>
  </div>

  ${incidenciasHtml}

  <div class="firma">
    <div style="margin-bottom:20pt;">
      <div class="firma-linea">${this.escapeHtml(f.guia?.nombre || '—')}</div>
      <div class="firma-label">Guía Responsable</div>
    </div>
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
        this.descargandoPdf = false;
        this.mostrarToast('PDF listo para imprimir/guardar', 'ok');
      }, 400);
    } else {
      this.descargandoPdf = false;
      this.mostrarToast('El navegador bloqueó la ventana emergente. Permite popups.', 'warn');
    }
  }

  private escapeHtml(text: string): string {
    const map: any = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' };
    return String(text ?? '').replace(/[&<>"']/g, (m: string) => map[m]);
  }

  // ─── INCIDENCIAS ──────────────────────────────────────────
  agregarObsIncidencia() {
    if (this.nuevaIncidenciaObs.trim()) {
      this.incidenciasJsonb.observaciones.push(this.nuevaIncidenciaObs.trim());
      this.nuevaIncidenciaObs = '';
    }
  }
  eliminarObsIncidencia(i: number) { this.incidenciasJsonb.observaciones.splice(i, 1); }

  agregarObsIncidenciaEdicion() {
    if (!this.fichaSeleccionada) return;
    if (!this.fichaSeleccionada.incidenciasJsonb) this.fichaSeleccionada.incidenciasJsonb = { inasistencias: 0, incumplimientos: 0, observaciones: [] };
    if (!this.fichaSeleccionada.incidenciasJsonb.observaciones) this.fichaSeleccionada.incidenciasJsonb.observaciones = [];
    const val = (this.fichaSeleccionada as any)._nuevaObs?.trim();
    if (val) { this.fichaSeleccionada.incidenciasJsonb.observaciones.push(val); (this.fichaSeleccionada as any)._nuevaObs = ''; }
  }
  eliminarObsIncidenciaEdicion(i: number) { this.fichaSeleccionada?.incidenciasJsonb?.observaciones?.splice(i, 1); }

  // ─── GUARDAR ──────────────────────────────────────────────
  guardar() {
    this.submitted = true;
    if (!this.validarFormulario()) {
      this.mostrarToast('Completa los campos obligatorios', 'warn');
      return;
    }
    if (!this.userId) {
      this.mostrarToast('No se pudo obtener tu usuario. Inicia sesión de nuevo.', 'error');
      return;
    }
    this.guardando = true;
    const payload = {
      expedienteId: this.expediente.id,
      guiaId: this.userId,
      fecha: this.fecha,
      periodo: this.periodo,
      datosPersonalesJsonb: this.datosPersonalesJsonb,
      cumplimientoGeneral: this.cumplimientoGeneral,
      comportamiento: this.comportamiento,
      observaciones: this.observaciones,
      incidenciasJsonb: this.incidenciasJsonb,
      recomendaciones: this.recomendaciones
    };
    console.log('📝 Enviando payload Ficha:', payload);

    this.penalService.saveFichaSeguimiento(payload).subscribe({
      next: (res) => {
        console.log('✅ Éxito al guardar ficha:', res);
        this.guardando = false;
        this.mostrarToast('¡Ficha guardada con éxito!', 'ok');
        setTimeout(() => this.router.navigate(['/detalle-penal', this.expediente.id]), 1500);
      },
      error: (err) => {
        console.error('❌ Error al guardar ficha:', err);
        this.guardando = false;
        if (err.status === 409) {
          this.mostrarToast(`Ya existe una ficha para "${this.periodo}". Cambia el periodo.`, 'warn');
        } else {
          this.mostrarToast('Error al guardar la ficha. Revisa la consola.', 'error');
        }
      }
    });
  }

  // ─── ROLES ────────────────────────────────────────────────
  esAdmin() { return this.role === 'admin'; }
  esGuia()  { return this.role === 'guia'; }
  puedeEliminar() { return this.esAdmin(); }
  puedeEditar()   { return this.esAdmin() || this.esGuia(); }

  // ─── VOLVER ───────────────────────────────────────────────
  volver() {
    this.expediente
      ? this.router.navigate(['/detalle-penal', this.expediente.id])
      : this.router.navigate(['/expedientes']);
  }
}
