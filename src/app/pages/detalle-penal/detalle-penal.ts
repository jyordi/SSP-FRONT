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

  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private penalService: PenalService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];

    this.service.getResumenPenal(id).subscribe({
      next: (res: any) => {
        this.expediente   = res.expediente;
        this.validaciones = res.validaciones ?? {};
        this.resumen      = res;
        this.loading      = false;

        if (this.esAdmin() || this.esPsicologo()) {
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
      error: ()        => { this.planes = []; }
    });
  }

  // ─── VALORACIÓN ───────────────────────────────────────────
  getValoracion() {
    this.penalService.getValoracionByExpediente(this.expediente.id).subscribe({
      next: (res: any) => { this.valoracion = res;   this.loadingValoracion = false; },
      error: ()        => { this.valoracion = null;  this.loadingValoracion = false; }
    });
  }

  // ─── FOTO ─────────────────────────────────────────────────
  onFileSelected(event: any) {
    if (!this.esAdmin()) return;
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
    this.service.updatePenal(this.expediente.id, {
      delito:        this.expediente.delito,
      juzgado:       this.expediente.juzgado,
      agraviado:     this.expediente.agraviado,
      medidaCautelar:this.expediente.medidaCautelar,
      observaciones: this.expediente.observaciones,
      cPenal:        this.expediente.cPenal,
      expedienteTecnico: this.expediente.expedienteTecnico,
      folioExpediente:   this.expediente.folioExpediente,
    }).subscribe({
      next: () => { this.guardando = false; this.mostrarToast('Guardado correctamente', 'ok'); },
      error: () => { this.guardando = false; this.mostrarToast('Error al guardar', 'error'); }
    });
  }

  // ─── PROGRESO DE TIEMPO ───────────────────────────────────
  get progreso(): { transcurrido: number; total: number; porcentaje: number; restante: number; unidad: string } {
    const b = this.expediente?.beneficiario;
    if (!b?.fechaIngreso || !b?.tiempoAsignado) {
      return { transcurrido: 0, total: 0, porcentaje: 0, restante: 0, unidad: 'meses' };
    }
    const fechaIngreso   = new Date(b.fechaIngreso);
    const ahora          = new Date();
    const diasTrans      = Math.floor((ahora.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
    const unidadRaw      = (b.unidadTiempo ?? 'MESES').toUpperCase();
    const esHoras        = unidadRaw === 'HORAS';
    const transcurrido   = esHoras ? Math.floor(diasTrans * 24) : Math.floor(diasTrans / 30.44);
    const total          = b.tiempoAsignado as number;
    const porcentaje     = total > 0 ? Math.min(100, Math.round((transcurrido / total) * 100)) : 0;
    const restante       = Math.max(0, total - transcurrido);
    return { transcurrido, total, porcentaje, restante, unidad: esHoras ? 'horas' : 'meses' };
  }

  get progresoColor(): string {
    const p = this.progreso.porcentaje;
    if (p >= 100) return '#27ae60';
    if (p >= 75)  return '#e67e22';
    if (p >= 50)  return '#f39c12';
    return '#850a31';
  }

  // SVG ring
  readonly ringR        = 54;
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
      { key: 'REGISTRADO',        label: 'Registrado',       icon: '📋' },
      { key: 'F1_COMPLETO',       label: 'F1 Psicología',    icon: '🧠' },
      { key: 'F2_COMPLETO',       label: 'F2 Trab. Social',  icon: '👥' },
      { key: 'PLAN_COMPLETO',     label: 'Plan de trabajo',  icon: '📝' },
      { key: 'CARATULA_HABILITADA', label: 'Carátula',       icon: '📄' },
      { key: 'EN_SUPERVISION',    label: 'En supervisión',   icon: '👁️' },
      { key: 'CERRADO',           label: 'Cerrado',          icon: '✅' },
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
  esAdmin()        { return this.role === 'admin'; }
  esPsicologo()    { return this.role === 'psicologo'; }
  esTrabajoSocial(){ return this.role === 'trabajo_social'; }
  esGuia()         { return this.role === 'guia'; }
  
  get puedeAccederCaratula(): boolean {
    if (!this.validaciones) return false;
    // Se habilita si ya existe la carátula O si se cumplen todos los requisitos previos (F1, F2, F3 y Actividades)
    const requisitosCompletos = 
      this.validaciones.tieneF1 && 
      this.validaciones.tieneF2 && 
      this.validaciones.tieneF3 && 
      this.validaciones.tieneDetalleF3;
      
    return !!(this.validaciones.tieneCaratula || requisitosCompletos);
  }

  // ─── NAVEGACIÓN ───────────────────────────────────────────
  volver() { this.router.navigate(['/expedientes']); }

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
    this.router.navigate(['/penal/incidencias', this.expediente.id], {
      state: { expediente: this.expediente }
    });
  }
}