import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { SessionService } from '../../services/session';
import { PenalService } from '../../services/penal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './detalle-penal.html',
  styleUrls: ['./detalle-penal.css']
})
export class DetallePenalComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';
  planes: any[] = [];
  validaciones: any = {};
  resumen: any = {};

  previewUrl: string | ArrayBuffer | null = null;
  selectedFile!: File;

  valoracion: any = null;
  loadingValoracion = true;
  showLightbox = false;

  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;
  descargandoPdf = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private penalService: PenalService
  ) { }

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];

    this.service.getResumenPenal(id).subscribe({
      next: (res: any) => {
        this.expediente = res.expediente;
        this.validaciones = res.validaciones ?? {};
        this.resumen = res;
        this.loading = false;

        if (this.esAdmin || this.esPsicologo) {
          this.getValoracion();
        } else {
          this.loadingValoracion = false;
        }
      },
      error: () => {
        this.loading = false;
        this.mostrarToast('Error al cargar expediente', 'error');
      }
    });

    this.penalService.getPlanTrabajoByExpediente(id).subscribe({
      next: (res: any) => { this.planes = Array.isArray(res) ? res : [res]; },
      error: () => { this.planes = []; }
    });
  }

  // ─── VALORACIÓN ───────────────────────────────────────────
  getValoracion() {
    if (!this.expediente?.id) return;
    this.penalService.getValoracionByExpediente(this.expediente.id).subscribe({
      next: (res: any) => { this.valoracion = res; this.loadingValoracion = false; },
      error: () => { this.valoracion = null; this.loadingValoracion = false; }
    });
  }

  // ─── FOTO ─────────────────────────────────────────────────
  onFileSelected(event: any) {
    if (!this.esAdmin) return;
    const file = event.target.files[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.previewUrl = reader.result; };
    reader.readAsDataURL(file);
  }

  // ─── GUARDAR ──────────────────────────────────────────────
  guardarCambios() {
    this.guardando = true;

    // 1. Datos básicos
    this.service.updatePenal(this.expediente.id, {
      delito: this.expediente.delito,
      juzgado: this.expediente.juzgado,
      agraviado: this.expediente.agraviado,
      medidaCautelar: this.expediente.medidaCautelar,
      observaciones: this.expediente.observaciones,
      cPenal: this.expediente.cPenal,
      expedienteTecnico: this.expediente.expedienteTecnico,
      folioExpediente: this.expediente.folioExpediente,
    }).subscribe({
      next: () => {
        // 2. Si hay foto, subirla
        if (this.selectedFile) {
          const bId = this.expediente?.beneficiario?.id;
          if (bId) {
            this.penalService.uploadFotoBeneficiario(bId, this.selectedFile).subscribe({
              next: () => {
                this.guardando = false;
                this.mostrarToast('Cambios y foto guardados', 'ok');
              },
              error: () => {
                this.guardando = false;
                this.mostrarToast('Datos guardados, pero error al subir foto', 'error');
              }
            });
          } else {
            this.guardando = false;
            this.mostrarToast('Datos guardados', 'ok');
          }
        } else {
          this.guardando = false;
          this.mostrarToast('Datos guardados correctamente', 'ok');
        }
      },
      error: () => {
        this.guardando = false;
        this.mostrarToast('Error al guardar datos', 'error');
      }
    });
  }

  // ─── PROGRESO DE TIEMPO ───────────────────────────────────
  get progreso(): { transcurrido: number; total: number; porcentaje: number; restante: number; unidad: string } {
    const b = this.expediente?.beneficiario;
    if (!b?.fechaIngreso || !b?.tiempoAsignado) {
      return { transcurrido: 0, total: 0, porcentaje: 0, restante: 0, unidad: 'meses' };
    }
    const fechaIngreso = new Date(b.fechaIngreso);
    const ahora = new Date();
    const diasTrans = Math.floor((ahora.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
    const unidadRaw = (b.unidadTiempo ?? 'MESES').toUpperCase();
    const esHoras = unidadRaw === 'HORAS';
    const transcurrido = esHoras ? Math.floor(diasTrans * 24) : Math.floor(diasTrans / 30.44);
    const total = b.tiempoAsignado as number;
    const porcentaje = total > 0 ? Math.min(100, Math.round((transcurrido / total) * 100)) : 0;
    const restante = Math.max(0, total - transcurrido);
    return { transcurrido, total, porcentaje, restante, unidad: esHoras ? 'horas' : 'meses' };
  }

  get progresoColor(): string {
    const p = this.progreso.porcentaje;
    if (p >= 100) return '#27ae60';
    if (p >= 75) return '#e67e22';
    if (p >= 50) return '#f39c12';
    return '#850a31';
  }

  // SVG ring
  readonly ringR = 54;
  readonly circumference = 2 * Math.PI * this.ringR;
  get strokeDashoffset(): number {
    return this.circumference * (1 - this.progreso.porcentaje / 100);
  }

  // ─── ESTATUS ──────────────────────────────────────────────
  formatEstatus(s: string): string {
    return (s ?? '').replace(/_/g, ' ');
  }

  get estatusPasos() {
    return [
      { key: 'REGISTRADO', label: 'Registrado', icon: '📋' },
      { key: 'F1_COMPLETO', label: 'F1 Psicología', icon: '🧠' },
      { key: 'F2_COMPLETO', label: 'F2 Trab. Social', icon: '👥' },
      { key: 'PLAN_COMPLETO', label: 'Plan de trabajo', icon: '📝' },
      { key: 'CARATULA_HABILITADA', label: 'Carátula', icon: '📄' },
      { key: 'EN_SUPERVISION', label: 'En supervisión', icon: '👁️' },
      { key: 'CERRADO', label: 'Cerrado', icon: '✅' },
    ];
  }

  get estatusIndex(): number {
    return this.estatusPasos.findIndex(s => s.key === this.expediente?.estatus);
  }

  // ─── TOAST ────────────────────────────────────────────────
  mostrarToast(msg: string, tipo: 'ok' | 'error') {
    this.toast = { msg, tipo };
    setTimeout(() => { this.toast = null; }, 3500);
  }

  // ─── ROLES ────────────────────────────────────────────────
  get userRole() { return this.role?.toLowerCase() || 'invitado'; }
  get esAdmin() { return this.userRole === 'admin'; }
  get esPsicologo() { return this.userRole === 'psicologo'; }
  get esTrabajoSocial() { return this.userRole === 'trabajo_social' || this.userRole === 'trabajadorsocial'; }
  get esGuia() { return this.userRole === 'guia'; }

  get permisoDesc(): string {
    if (this.esAdmin) return 'Acceso Total (Administrador)';
    if (this.esGuia) return 'Acceso de Registro (Guía Cívico)';
    if (this.esTrabajoSocial) return 'Acceso de Consulta (T. Social)';
    if (this.esPsicologo) return 'Acceso de Consulta (Psicología)';
    return 'Acceso restringido';
  }

  get puedeVerResumen() { return this.esAdmin || this.esTrabajoSocial; }

  get puedeAccederCaratula(): boolean {
    if (!this.validaciones) return false;
    const requisitosCompletos =
      this.validaciones.tieneF1 &&
      this.validaciones.tieneF2 &&
      this.validaciones.tieneF3 &&
      this.validaciones.tieneDetalleF3;
    return !!(this.validaciones.tieneCaratula || requisitosCompletos);
  }

  // ─── LÓGICA DE ESTADO POR MÓDULO ─────────────────────────
  getModStatus(mod: 'f1' | 'f2' | 'f3' | 'caratula' | 'detalle_plan'): 'complete' | 'ready' | 'locked' {
    if (!this.validaciones) return 'locked';
    
    switch (mod) {
      case 'f1': return this.validaciones.tieneF1 ? 'complete' : 'ready';
      case 'f2': return this.validaciones.tieneF2 ? 'complete' : 'ready';
      case 'f3': 
        if (!this.validaciones.tieneF1 || !this.validaciones.tieneF2) return 'locked';
        return this.validaciones.tieneF3 ? 'complete' : 'ready';
      case 'detalle_plan':
        if (!this.validaciones.tieneF3) return 'locked';
        return this.validaciones.tieneDetalleF3 ? 'complete' : 'ready';
      case 'caratula':
        if (!this.puedeAccederCaratula) return 'locked';
        return this.validaciones.tieneCaratula ? 'complete' : 'ready';
      default: return 'ready';
    }
  }

  // ─── NAVEGACIÓN ───────────────────────────────────────────
  volver() { this.router.navigate(['/expedientes']); }

  descargarCaratula() {
    if (!this.expediente?.id) return;
    this.descargandoPdf = true;
    this.penalService.getCaratulaPdf(this.expediente.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CARATULA_${this.expediente.cPenal || this.expediente.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargandoPdf = false;
        this.mostrarToast('✅ Carátula descargada', 'ok');
      },
      error: () => {
        this.descargandoPdf = false;
        this.mostrarToast('Error al generar PDF', 'error');
      }
    });
  }

  irModulo(ruta: string) {
    sessionStorage.setItem('expediente', JSON.stringify(this.expediente));
    this.router.navigate([ruta], { state: { expediente: this.expediente } });
  }

  irDetalleAdmin(): void {
    const plan = this.planes[0];
    if (!plan) { this.mostrarToast('No hay plan disponible', 'error'); return; }
    this.router.navigate(['/plan-detalle-admin', plan.id], {
      state: { expediente: this.expediente, beneficiario: this.expediente?.beneficiario }
    });
  }

  irFichaSeguimiento(): void {
    this.router.navigate(['/penal/ficha-seguimiento', this.expediente.id], {
      state: { expediente: this.expediente }
    });
  }

  irHistorialSupervision(): void {
    this.router.navigate(['/penal/historial-supervision', this.expediente.id], {
      state: { expediente: this.expediente }
    });
  }

  irNotaEvolucion(): void {
    this.router.navigate(['/penal/nota-evolucion', this.expediente.id], {
      state: { expediente: this.expediente }
    });
  }

  irIncidencias(): void {
    if (!this.expediente?.id) return;
    this.router.navigate(['/penal/incidencias', this.expediente.id], {
      state: { expediente: this.expediente }
    });
  }

  // ─── LIGHTBOX ─────────────────────────────────────────────
  openLightbox() {
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.showLightbox = false;
    document.body.style.overflow = 'auto';
  }
}