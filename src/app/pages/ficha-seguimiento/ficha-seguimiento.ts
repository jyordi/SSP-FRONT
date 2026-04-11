import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  selector: 'app-ficha-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './ficha-seguimiento.html',
  styleUrls: ['./ficha-seguimiento.css']
})
export class FichaSeguimientoComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private penalService = inject(PenalService);
  private session = inject(SessionService);

  // ─── Estado General ────────────────────────────────────────
  expediente: any = null;
  loading = true;
  guardando = false;
  eliminando = false;
  descargandoPdf = false;

  // ─── Vistas ────────────────────────────────────────────────
  vistaActiva: 'nueva' | 'historial' = 'nueva';
  
  // ─── Historial ─────────────────────────────────────────────
  fichas: any[] = [];
  loadingHistorial = false;
  fichaSeleccionada: any = null;
  modoEdicion = false;

  // ─── UI / Feedback ─────────────────────────────────────────
  toast: { msg: string; tipo: 'ok' | 'error' | 'warn' | 'info' } | null = null;
  errores: { [k: string]: string } = {};
  submitted = false;

  // ─── Formulario ───────────────────────────────────────────
  fecha = '';
  periodo = '';
  datosPersonalesJsonb: any = { nombre: '', telefono: '', domicilio: '' };
  cumplimientoGeneral = '';
  comportamiento = '';
  observaciones = '';
  incidenciasJsonb: any = { inasistencias: 0, incumplimientos: 0, observaciones: [] };
  nuevaIncidenciaObs = '';
  recomendaciones = '';

  // ─── Modal Incidencias ──────────────────────────────────────
  showIncidenciasModal = false;
  incidenciasList: any[] = [];

  // ─── Roles ─────────────────────────────────────────────────
  get userRole() { return this.session.getRole().toLowerCase(); }
  get esAdmin() { return this.userRole === 'admin'; }
  get esGuia()  { return this.userRole === 'guia'; }
  get esPsicologo() { return this.userRole === 'psicologo'; }
  get esTrabajadorSocial() { return this.userRole === 'trabajadorsocial' || this.userRole === 'trabajo_social'; }

  get puedeCrear() { return this.esGuia; }
  get puedeEditar() { return this.esAdmin || this.esGuia; }
  get puedeEliminar() { return this.esAdmin; }
  
  // 🔥 Detección proactiva de 409 Conflict
  get periodoDuplicado(): boolean {
    if (this.modoEdicion || this.vistaActiva !== 'nueva') return false;
    const pNormal = this.periodo?.trim().toLowerCase();
    return this.fichas.some(f => f.periodo?.trim().toLowerCase() === pNormal);
  }

  get permisoDesc(): string {
    if (this.esAdmin) return 'Acceso Total (Administrador)';
    if (this.esGuia) return 'Acceso de Registro (Guía Cívico)';
    if (this.esTrabajadorSocial) return 'Acceso de Consulta (T. Social)';
    if (this.esPsicologo) return 'Acceso de Consulta (Psicología)';
    return 'Acceso restringido';
  }

  // 🛠️ Getter para habilitar botón de guardado
  get isFormValid(): boolean {
    const target = this.modoEdicion ? this.fichaSeleccionada : this;
    if (!target) return false;

    return !!(
      this.fecha &&
      this.periodo?.trim() &&
      target.cumplimientoGeneral?.trim() &&
      target.comportamiento?.trim() &&
      !this.periodoDuplicado
    );
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
      this.initForm();
      this.cargarIncidenciasBackend(); // 🔥 Auto-relleno
      this.loading = false;
      // Si el usuario no puede crear, enviarlo al historial por defecto
      if (!this.puedeCrear) {
        this.cambiarVista('historial');
      }
    } else {
      this.mostrarToast('No se encontró el expediente', 'error');
      this.router.navigate(['/expedientes']);
    }
  }

  initForm() {
    this.fecha = new Date().toISOString().split('T')[0];
    this.onFechaChange();

    if (this.expediente?.beneficiario) {
      const b = this.expediente.beneficiario;
      this.datosPersonalesJsonb = {
        nombre: b.nombre || ''
      };
    }
  }

  // 🔥 Auto-calcular periodo al cambiar fecha
  onFechaChange() {
    if (!this.fecha) return;
    const d = new Date(this.fecha + 'T12:00:00'); // Forzar mediodía para evitar desfases de zona horaria
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.periodo = `${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  // 🔥 NUEVO: Cargar incidencias desde el backend y procesar conteo
  cargarIncidenciasBackend() {
    if (!this.expediente?.id) return;
    
    this.penalService.getIncidenciasByExpediente(this.expediente.id).subscribe({
      next: (res: any[]) => {
        if (!res || !Array.isArray(res)) return;

        this.incidenciasList = res; // 🔥 Guardar para el modal
        // Reset contadores
        this.incidenciasJsonb = { inasistencias: 0, incumplimientos: 0, observaciones: [] };

        res.forEach(inc => {
          const desc = (inc.descripcion || inc.observaciones || '').toLowerCase();
          const tipo = (inc.tipo || '').toLowerCase();

          // Lógica de conteo basada en texto o tipo
          if (desc.includes('inasistencia') || tipo.includes('inasistencia')) {
            this.incidenciasJsonb.inasistencias++;
          } else if (desc.includes('incumplimiento') || tipo.includes('incumplimiento')) {
            this.incidenciasJsonb.incumplimientos++;
          }

          // Añadir a la lista de observaciones con su folio/tipo
          const label = inc.tipo ? `[${inc.tipo}] ` : '';
          this.incidenciasJsonb.observaciones.push(`${label}${inc.descripcion || 'Sin descripción'}`);
        });

        console.log('✅ Incidencias auto-rellenadas:', this.incidenciasJsonb);
      },
      error: (err) => {
        if (err.status === 404) {
          this.incidenciasList = [];
          this.incidenciasJsonb = { inasistencias: 0, incumplimientos: 0, observaciones: [] };
          console.log('ℹ️ No se encontraron incidencias (404). Se asume historial limpio.');
        } else {
          console.error('❌ Error al jalar incidencias:', err);
        }
      }
    });
  }

  // ─── Gestión de Vistas ────────────────────────────────────
  cambiarVista(v: 'nueva' | 'historial') {
    this.vistaActiva = v;
    this.submitted = false;
    this.errores = {};
    if (v === 'historial') this.cargarHistorial();
  }

  cargarHistorial() {
    if (!this.expediente?.id) return;
    this.loadingHistorial = true;
    this.penalService.getFichasSeguimientoByExpediente(this.expediente.id).subscribe({
      next: (res: any) => {
        this.fichas = Array.isArray(res) ? res : (res?.data ? res.data : [res]);
        this.loadingHistorial = false;
        if (this.fichas.length && !this.fichaSeleccionada) {
          this.seleccionarFicha(this.fichas[0]);
        }
      },
      error: () => { 
        this.fichas = []; 
        this.loadingHistorial = false; 
      }
    });
  }

  seleccionarFicha(f: any) {
    this.fichaSeleccionada = JSON.parse(JSON.stringify(f));
    this.modoEdicion = false;
  }

  // ─── Acciones CRUD ────────────────────────────────────────
  validar(): boolean {
    this.errores = {};
    if (!this.fecha) this.errores['fecha'] = 'La fecha es obligatoria';
    if (!this.periodo?.trim()) this.errores['periodo'] = 'El periodo es obligatorio';
    if (!this.cumplimientoGeneral?.trim()) this.errores['cumplimientoGeneral'] = 'Campo obligatorio';
    if (!this.comportamiento?.trim()) this.errores['comportamiento'] = 'Campo obligatorio';
    
    if (this.periodoDuplicado) {
      this.errores['periodo'] = 'Ya existe un reporte para este periodo';
    }

    return Object.keys(this.errores).length === 0;
  }

  guardar() {
    this.submitted = true;
    if (!this.validar()) { this.mostrarToast('Completa los campos obligatorios', 'warn'); return; }
    
    const guiaId = Number(this.session.getUserId());
    if (!guiaId) {
      this.mostrarToast('Error de sesión: No se encontró ID de Guía', 'error');
      console.error('❌ Error: session.getUserId() devolvió vacío o nulo');
      return;
    }

    this.guardando = true;
    const payload = {
      expedienteId: Number(this.expediente.id),
      guiaId: guiaId,
      fecha: this.fecha,
      periodo: this.periodo,
      datosPersonalesJsonb: this.datosPersonalesJsonb,
      cumplimientoGeneral: this.cumplimientoGeneral,
      comportamiento: this.comportamiento,
      observaciones: this.observaciones,
      incidenciasJsonb: this.incidenciasJsonb,
      recomendaciones: this.recomendaciones
    };

    console.log('🚀 Enviando Ficha al Backend:', JSON.stringify(payload, null, 2));

    if (this.modoEdicion && this.fichaSeleccionada?.id) {
      this.penalService.updateFichaSeguimiento(this.fichaSeleccionada.id, payload).subscribe({
        next: (res) => {
          console.log('✅ Respuesta Exitosa (Update):', res);
          this.guardando = false;
          this.modoEdicion = false;
          this.mostrarToast('Ficha actualizada correctamente', 'ok');
          this.cargarHistorial();
        },
        error: (err) => {
          console.error('❌ Error al actualizar ficha:', err);
          this.guardando = false;
          const msg = err.error?.message || (err.status === 409 ? 'El periodo ya existe' : 'Error al actualizar');
          this.mostrarToast(msg, 'error');
        }
      });
    } else {
      this.penalService.saveFichaSeguimiento(payload).subscribe({
        next: (res) => {
          console.log('✅ Respuesta Exitosa (Save):', res);
          this.guardando = false;
          this.mostrarToast('Ficha guardada con éxito', 'ok');
          this.limpiarForm();
          this.cambiarVista('historial');
        },
        error: (err: any) => {
          console.error('❌ Error al guardar ficha:', err);
          this.guardando = false;
          const msg = err.error?.message || (err.status === 409 ? 'Ya existe una ficha para este periodo' : 'Error al guardar');
          this.mostrarToast(msg, 'error');
        }
      });
    }
  }

  eliminarFicha(id: number) {
    if (!this.puedeEliminar) { this.mostrarToast('Sin permiso para eliminar', 'error'); return; }
    if (!confirm('¿Eliminar esta ficha de seguimiento?')) return;
    
    this.eliminando = true;
    this.penalService.deleteFichaSeguimiento(id).subscribe({
      next: () => {
        this.eliminando = false;
        this.fichaSeleccionada = null;
        this.mostrarToast('Ficha eliminada', 'ok');
        this.cargarHistorial();
      },
      error: () => { this.eliminando = false; this.mostrarToast('Error al eliminar', 'error'); }
    });
  }

  descargarPdf(id: number) {
    this.descargandoPdf = true;
    this.penalService.getFichaSeguimientoPdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FICHA_SEGUIMIENTO_${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargandoPdf = false;
        this.mostrarToast('Documento descargado', 'ok');
      },
      error: () => {
        this.descargandoPdf = false;
        this.mostrarToast('Error al generar PDF', 'error');
      }
    });
  }

  // ─── Incidencias ──────────────────────────────────────────
  agregarIncidencia() {
    if (this.nuevaIncidenciaObs.trim()) {
      const target = this.modoEdicion ? this.fichaSeleccionada : this;
      target.incidenciasJsonb.observaciones.push(this.nuevaIncidenciaObs.trim());
      this.nuevaIncidenciaObs = '';
    }
  }

  eliminarIncidencia(idx: number) {
    const target = this.modoEdicion ? this.fichaSeleccionada : this;
    target.incidenciasJsonb.observaciones.splice(idx, 1);
  }

  // ─── Utilidades ───────────────────────────────────────────
  limpiarForm() {
    this.initForm();
    this.cumplimientoGeneral = '';
    this.comportamiento = '';
    this.observaciones = '';
    this.incidenciasJsonb = { inasistencias: 0, incumplimientos: 0, observaciones: [] };
    this.recomendaciones = '';
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
