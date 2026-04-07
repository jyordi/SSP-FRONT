import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';
import { SessionService } from '../../services/session';
import { PenalService } from '../../services/penal';
import { ExpedientesService } from '../../services/expedientes';
import { UsersService } from '../../services/users.service'; // 👈 Importamos el servicio de usuarios

export interface Adjunto {
  id: number;
  nombre: string;
  tamano: number;
  tipo: string;
  dataUrl: string;
}

export interface PlanBackend {
  id: number;
  expedienteId: number;
  guia?: { id: number; nombre: string; apellidos?: string };
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  datosJsonb: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstadoPdf {
  activo: boolean;
  pct: number;
  fase: string;
  exito: boolean;
  error: string;
}

export interface Paso {
  titulo: string;
  desc: string;
  icono: string;
  color: string;
  requeridos: string[];
}

export const PASOS_WIZARD: Paso[] = [
  { titulo: 'Datos Personales', desc: 'Información básica del beneficiario', icono: '👤', color: '#850a31', requeridos: ['nombre'] },
  { titulo: 'Periodo / Fechas', desc: 'Periodo, fecha inicio, fecha fin y Guía', icono: '📅', color: '#1a5276', requeridos: ['periodo', 'fechaInicio', 'fechaFin', 'guiaId'] },
  { titulo: 'Proceso de Ingreso', desc: 'Descripción del proceso de ingreso a PREVENCIÓN', icono: '📝', color: '#145a32', requeridos: [] },
  { titulo: 'Seguimiento', desc: 'Actividades de seguimiento por área clave', icono: '🔄', color: '#6c3483', requeridos: [] },
  { titulo: 'Proyecto de Vida', desc: 'Metas personales, familiares y sociales', icono: '🎯', color: '#784212', requeridos: [] },
  { titulo: 'Actividades Programa', desc: 'Status, objetivos y cumplimiento — RECONECTA', icono: '✅', color: '#1b2631', requeridos: [] },
  { titulo: 'Adjuntos y Firma', desc: 'Documentos adjuntos y datos del firmante', icono: '✍️', color: '#2e4057', requeridos: [] },
];

export const CAMPOS_OBLIGATORIOS = PASOS_WIZARD.flatMap(p => p.requeridos);

export const ACTIVIDADES_SEG = [
  { key: 'educativa', label: 'EDUCATIVA' },
  { key: 'laboral', label: 'LABORAL' },
  { key: 'familiar', label: 'FAMILIAR' },
  { key: 'deportivo', label: 'DEPORTIVO' },
  { key: 'cultural', label: 'CULTURAL' },
] as const;

export const AREAS_VIDA = [
  { key: 'personal', label: 'PERSONAL' },
  { key: 'familiar', label: 'FAMILIAR' },
  { key: 'social', label: 'SOCIAL' },
] as const;

export const ACTIVIDADES_PROG = [
  { key: 'pEducativa', label: 'EDUCATIVA' },
  { key: 'pPsicosocial', label: 'PSICOSOCIAL / RED APOYO' },
  { key: 'pPsicologica', label: 'PSICOLÓGICA' },
  { key: 'pAdicciones', label: 'ADICCIONES' },
  { key: 'pFamiliar', label: 'FAMILIAR' },
  { key: 'pLaboral', label: 'LABORAL' },
  { key: 'pDeportiva', label: 'DEPORTIVA' },
  { key: 'pCultural', label: 'CULTURAL' },
] as const;

@Component({
  selector: 'app-plan-trabajo-individualizado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './plan-trabajo-individualizado.component.html',
  styleUrls: ['./plan-trabajo-individualizado.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanTrabajoIndividualizadoComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  expedienteId: number | null = null;
  role = '';
  userId: number | null = null;
  expedienteBase: any = null;
  beneficiario: any = null;

  readonly planesBackend = signal<PlanBackend[]>([]);
  readonly cargandoPlanes = signal(false);
  readonly planEditandoId = signal<number | null>(null);
  readonly eliminandoId = signal<number | null>(null);

  readonly tabActivo = signal<'form' | 'hist'>('form');
  readonly paso = signal(0);
  readonly verPrevia = signal(false);
  readonly adjuntos = signal<Adjunto[]>([]);
  readonly toast = signal<{ msg: string; tipo: string }>({ msg: '', tipo: '' });
  readonly estado = signal<EstadoPdf>({ activo: false, pct: 0, fase: '', exito: false, error: '' });
  readonly dragging = signal(false);
  readonly generando = signal(false);
  readonly guardando = signal(false);
  readonly pct = signal(0);
  readonly slideOut = signal(false);
  readonly fotoUrl = signal<string>('');

  readonly guias = signal<any[]>([]);
  readonly actividades = signal<any[]>([]);
  readonly cargandoActividades = signal(false);
  readonly modalActividad = signal(false);
  actividadForm!: FormGroup;

  readonly completo = computed(() => CAMPOS_OBLIGATORIOS.every(k => { const v = this.fg?.value?.[k]; return v && v !== ''; }));
  readonly pendientes = computed(() => CAMPOS_OBLIGATORIOS.filter(k => { const v = this.fg?.value?.[k]; return !v || v === ''; }));
  readonly totalPlanes = computed(() => this.planesBackend().length);

  fg!: FormGroup;

  readonly PASOS = PASOS_WIZARD;
  readonly ASEG = ACTIVIDADES_SEG;
  readonly AVIDA = AREAS_VIDA;
  readonly APROG = ACTIVIDADES_PROG;

  readonly detallePlan = signal<any[]>([]);
  readonly cargandoDetalle = signal(false);
  detalleForm!: FormGroup;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private session: SessionService,
    private penalService: PenalService,
    private expedientesService: ExpedientesService,
    private usersService: UsersService // 👈 Inyectamos el servicio de usuarios
  ) {}

  ngOnInit(): void {
    this.role = this.session.getRole();
    this.userId = this.session.getUserId?.() ?? this._parseUserIdFromToken();

    const paramId = this.route.snapshot.params['id'];
    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;

    if (navState?.expediente) {
      this.expedienteBase = navState.expediente;
      this.expedienteId = navState.expediente.id;
    } else if (paramId) {
      this.expedienteId = +paramId;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try {
          this.expedienteBase = JSON.parse(raw);
          this.expedienteId = this.expedienteBase?.id ?? null;
        } catch { }
      }
    }

    this._buildForm();
    this._watchPct();
    this._cargarGuias();

    if (this.expedienteId) {
      this._cargarExpedienteYBeneficiario();
      this._cargarPlanes();
      this._cargarActividades();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 👇 FILTRAMOS A LOS USUARIOS QUE TENGAN ROL DE GUIA
  private _cargarGuias(): void {
    this.usersService.obtenerUsuarios().subscribe({
      next: (res: any[]) => {
        const soloGuias = res.filter(u => u.rol === 'guia');
        this.guias.set(soloGuias);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  private _cargarExpedienteYBeneficiario(): void {
    this.expedientesService.getResumenPenal(this.expedienteId!).subscribe({
      next: (res: any) => {
        this.expedienteBase = res.expediente ?? res;
        const benef = res.beneficiario ?? res.expediente?.beneficiario ?? null;
        this.beneficiario = benef;
        this._rellenarDatosPersonales(benef, this.expedienteBase);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (this.expedienteBase) {
          this._rellenarDatosPersonales(this.expedienteBase?.beneficiario ?? null, this.expedienteBase);
        }
        this.cdr.markForCheck();
      },
    });
  }

  private _rellenarDatosPersonales(benef: any, exp: any): void {
    if (!this.fg) return;

    const nombre = benef?.nombre ?? benef?.nombreCompleto ?? `${benef?.nombre ?? ''} ${benef?.apellidoPaterno ?? ''} ${benef?.apellidoMaterno ?? ''}`.trim() ?? exp?.nombre ?? '';
    const patch: Record<string, any> = {};

    if (nombre) patch['nombre'] = nombre;
    if (benef?.edad != null) patch['edad'] = String(benef.edad);
    if (benef?.municipio) patch['municipio'] = benef.municipio;
    if (benef?.ocupacion) patch['ocupacion'] = benef.ocupacion;
    if (benef?.telefono) patch['telefono'] = benef.telefono;
    if (exp?.fechaIngreso) patch['fechaIngreso'] = exp.fechaIngreso?.slice(0, 10);

    const fotoSrc = benef?.urlFoto || benef?.foto || benef?.fotoUrl || benef?.fotografia || benef?.imagen || benef?.url || benef?.profileImage || null;
    if (fotoSrc) { this.fotoUrl.set(fotoSrc); }

    if (fotoSrc && fotoSrc.startsWith('http')) {
      this._urlToDataUrl(fotoSrc).then(du => {
        this.fotoUrl.set(du);
        this.cdr.markForCheck();
      }).catch(() => { });
    }

    let preSelectGuia = null;
    if (this.role === 'guia') {
      preSelectGuia = this.userId;
    } else if (exp?.guiaId) {
      preSelectGuia = exp.guiaId;
    }
    if (preSelectGuia) patch['guiaId'] = preSelectGuia;

    if (Object.keys(patch).length) {
      this.fg.patchValue(patch, { emitEvent: false });
    }
  }

  private _cargarPlanes(): void {
    if (!this.expedienteId) return;
    this.cargandoPlanes.set(true);
    this.penalService.getPlanTrabajoByExpediente(this.expedienteId).subscribe({
      next: (res: any) => {
        const planes = Array.isArray(res) ? res : [res];
        this.planesBackend.set(planes);
        if (planes.length > 0) {
          this.tabActivo.set('hist');
          this._cargarDetalle(planes[0].id);
        }
        this.cargandoPlanes.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoPlanes.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private _cargarActividades(): void {
    this.cargandoActividades.set(true);
    this.penalService.getActividades().subscribe({
      next: (res: any) => {
        this.actividades.set(Array.isArray(res) ? res : [res]);
        this.cargandoActividades.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.cargandoActividades.set(false)
    });
  }

  irExpedientes() { this.router.navigate(['/expedientes']); }

  crearActividad(): void {
    const form = this.actividadForm.value;
    if (!form.categoria) { this.toast$('Selecciona una categoría', 'err'); return; }
    const data = {
      nombre: form.nombre?.trim(),
      descripcion: form.descripcion?.trim(),
      objetivo: form.objetivo?.trim(),
      categoria: form.categoria
    };
    this.penalService.crearActividad(data).subscribe({
      next: () => {
        this.toast$('Actividad creada');
        this._cargarActividades();
      },
      error: (err) => this.toast$(err.error?.message?.[0] || 'Error', 'err')
    });
  }

  private _cargarDetalle(planId: number): void {
    this.cargandoDetalle.set(true);
    this.penalService.getPlanDetalle(planId).subscribe({
      next: (res: any) => {
        this.detallePlan.set(Array.isArray(res) ? res : [res]);
        this.cargandoDetalle.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.cargandoDetalle.set(false)
    });
  }

  guardarDetalle(): void {
    const plan = this.planesBackend()[0];
    if (!plan) return;
    const form = this.detalleForm.value;
    const data = {
      planTrabajoId: Number(plan.id),
      actividadId: Number(form.actividadId),
      estatus: form.estatus,
      objetivo: form.objetivo,
      cumplimiento: form.cumplimiento,
      observaciones: form.observaciones,
      fechaAsignacion: form.fechaAsignacion
    };
    this.penalService.savePlanDetalle(data).subscribe({
      next: () => {
        this.toast$('Detalle guardado');
        this._cargarDetalle(plan.id);
      },
      error: () => this.toast$('Error al guardar detalle', 'err')
    });
  }

  cargarPlanEnFormulario(plan: PlanBackend): void {
    this.planEditandoId.set(plan.id);
    const d = plan.datosJsonb ?? {};

    const patch: Record<string, any> = {
      guiaId: plan.guia?.id ?? null,
      periodo: plan.periodo ?? '',
      fechaInicio: plan.fechaInicio?.slice(0, 10) ?? '',
      fechaFin: plan.fechaFin?.slice(0, 10) ?? '',
      procesoIngreso: d.proceso_ingreso?.situacion_actual ?? '',
      educativaObs: d.proceso_seguimiento?.educativa ?? '',
      laboralObs: d.proceso_seguimiento?.laboral ?? '',
      familiarObs: d.proceso_seguimiento?.familiar ?? '',
      deportivoObs: d.proceso_seguimiento?.deportivo ?? '',
      culturalObs: d.proceso_seguimiento?.cultural ?? '',
      vidaPersonalObs: d.proyecto_vida?.personal ?? '',
      vidaFamiliarObs: d.proyecto_vida?.familiar ?? '',
      vidaSocialObs: d.proyecto_vida?.social ?? '',
      obsStatus: d.seguimiento_programa?.observaciones?.status ?? '',
      obsObjetivo: d.seguimiento_programa?.observaciones?.objetivo ?? '',
      obsCumplimiento: d.seguimiento_programa?.observaciones?.cumplimiento ?? '',
      firmaNombre: d.firma?.nombre ?? '',
      firmaCargo: d.firma?.cargo ?? '',
      firmaFecha: d.firma?.fecha ?? '',
    };

    const seg = d.seguimiento_programa?.actividades ?? {};
    ACTIVIDADES_PROG.forEach(a => {
      patch[`${a.key}Status`] = seg[a.key]?.status ?? '';
      patch[`${a.key}Objetivo`] = seg[a.key]?.objetivo ?? '';
      patch[`${a.key}Cumplimiento`] = seg[a.key]?.cumplimiento ?? '';
    });

    this.fg.patchValue(patch);
    this.tabActivo.set('form');
    this.paso.set(0);
    this.toast$(`Editando plan: ${plan.periodo}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  eliminarPlan(plan: PlanBackend): void {
    if (!confirm(`¿Eliminar el plan "${plan.periodo}"?`)) return;
    this.eliminandoId.set(plan.id);
    this.penalService.deletePlanTrabajo(plan.id).subscribe({
      next: () => {
        this.planesBackend.update(list => list.filter(p => p.id !== plan.id));
        this.eliminandoId.set(null);
        if (this.planEditandoId() === plan.id) {
          this.planEditandoId.set(null);
          this.fg.reset();
        }
        this.toast$('Plan eliminado');
        this.cdr.markForCheck();
      },
      error: () => {
        this.eliminandoId.set(null);
        this.toast$('Error al eliminar el plan', 'err');
        this.cdr.markForCheck();
      },
    });
  }

  async guardarEnBackend(): Promise<void> {
    if (!this.expedienteId) { this.toast$('No se encontró el expediente', 'err'); return; }

    this.guardando.set(true);
    const fg = this.fg.value;

    const payload = {
      expedienteId: this.expedienteId,
      guiaId: Number(fg.guiaId),
      periodo: fg.periodo ?? '',
      fechaInicio: fg.fechaInicio ?? '',
      fechaFin: fg.fechaFin ?? '',
      datosJsonb: {
        proceso_ingreso: {
          situacion_actual: fg.procesoIngreso ?? '',
        },
        proceso_seguimiento: {
          educativa: fg.educativaObs ?? '',
          laboral: fg.laboralObs ?? '',
          familiar: fg.familiarObs ?? '',
        },
        proyecto_vida: {
          personal: fg.vidaPersonalObs ?? '',
          social: fg.vidaSocialObs ?? '',
        }
      }
    };

    if (this.planEditandoId()) {
      this.penalService.updatePlanTrabajo(this.planEditandoId()!, payload).subscribe({
        next: () => {
          this.toast$('Plan actualizado');
          this.router.navigate(['/expedientes']);
          this.guardando.set(false);
        },
        error: () => { this.toast$('Error al actualizar', 'err'); this.guardando.set(false); }
      });
    } else {
      this.penalService.savePlanTrabajo(payload).subscribe({
        next: () => {
          this.toast$('Plan guardado correctamente');
          this.router.navigate(['/expedientes']);
          this.guardando.set(false);
        },
        error: (err) => {
          if (err.status === 409) {
            this.toast$('Ya existe un plan para este expediente', 'err');
            this.router.navigate(['/expedientes']);
          } else {
            this.toast$('Error al guardar', 'err');
          }
          this.guardando.set(false);
        }
      });
    }
  }

  _descargarPdfServidor(planId: number, nombreBenef: string): void {
    this.guardando.set(true);
    this.penalService.getPlanTrabajoPdf(planId).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) { this.toast$('El PDF está vacío', 'err'); this.guardando.set(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan_trabajo_${nombreBenef}_${planId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.guardando.set(false);
        this.toast$('PDF descargado correctamente');
      },
      error: () => { this.toast$('Error al descargar PDF', 'err'); this.guardando.set(false); }
    });
  }

  private _buildForm(): void {
    const seg: Record<string, any> = {};
    this.ASEG.forEach(a => { seg[`${a.key}Obs`] = ['']; });

    const vida: Record<string, any> = {};
    this.AVIDA.forEach(a => { vida[`vida${a.key.charAt(0).toUpperCase() + a.key.slice(1)}Obs`] = ['']; });

    const prog: Record<string, any> = {};
    this.APROG.forEach(a => {
      prog[`${a.key}Status`] = [''];
      prog[`${a.key}Objetivo`] = [''];
      prog[`${a.key}Cumplimiento`] = [''];
    });

    this.fg = this.fb.group({
      nombre: ['', Validators.required],
      edad: [''],
      municipio: [''],
      ocupacion: [''],
      fechaIngreso: [''],
      telefono: [''],

      periodo: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      guiaId: [null, Validators.required], 

      procesoIngreso: [''],
      ...seg,
      ...vida,
      ...prog,

      obsStatus: [''],
      obsObjetivo: [''],
      obsCumplimiento: [''],

      firmaNombre: [''],
      firmaCargo: [''],
      firmaFecha: ['']
    });

    this.detalleForm = this.fb.group({
      actividadId: [''], estatus: ['PENDIENTE'], objetivo: [''], cumplimiento: [''], observaciones: [''], fechaAsignacion: ['']
    });

    this.actividadForm = this.fb.group({
      nombre: [''], descripcion: [''], objetivo: [''], categoria: ['TRABAJO_COMUNITARIO']
    });
  }

  private _watchPct(): void {
    const calc = () => {
      const v = this.fg?.value ?? {};
      const n = CAMPOS_OBLIGATORIOS.filter(k => v[k] && v[k] !== '').length;
      this.pct.set(CAMPOS_OBLIGATORIOS.length ? Math.round((n / CAMPOS_OBLIGATORIOS.length) * 100) : 100);
    };
    calc();
    this.fg.valueChanges.pipe(takeUntil(this.destroy$), debounceTime(80)).subscribe(calc);
  }

  siguiente(): void { if (this.paso() < PASOS_WIZARD.length - 1) this._navegar(() => this.paso.update(p => p + 1)); }
  anterior(): void { if (this.paso() > 0) this._navegar(() => this.paso.update(p => p - 1)); }
  irA(i: number): void { this._navegar(() => this.paso.set(i)); }

  private _navegar(fn: () => void): void {
    this.slideOut.set(true);
    setTimeout(() => { fn(); this.slideOut.set(false); this.cdr.markForCheck(); }, 200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pctPaso(i: number): number {
    const r = PASOS_WIZARD[i]?.requeridos ?? [];
    if (!r.length) return 100;
    const v = this.fg?.value ?? {};
    return Math.round((r.filter(k => v[k] && v[k] !== '').length / r.length) * 100);
  }
  pasoDone(i: number): boolean { return this.pctPaso(i) === 100; }

  onFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        this.adjuntos.update(a => [...a, {
          id: Date.now() + Math.random(), nombre: f.name, tamano: f.size, tipo: f.type, dataUrl: e.target!.result as string,
        }]);
        this.cdr.markForCheck();
      };
      r.readAsDataURL(f);
    });
  }
  quitarAdj(id: number): void { this.adjuntos.update(a => a.filter(x => x.id !== id)); }

  cargarFoto(file: File | null): void {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => { this.fotoUrl.set(e.target!.result as string); this.cdr.markForCheck(); };
    r.readAsDataURL(file);
  }
  quitarFoto(): void { this.fotoUrl.set(''); }

  toast$(msg: string, tipo: 'ok' | 'err' = 'ok'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => { this.toast.set({ msg: '', tipo: '' }); this.cdr.markForCheck(); }, 3500);
  }

  private _script(id: string, src: string): Promise<void> {
    return new Promise((ok, err) => {
      if (document.getElementById(id)) return ok();
      const s = Object.assign(document.createElement('script'), { id, src });
      s.onload = () => ok();
      s.onerror = () => err(new Error(`No se pudo cargar: ${src}`));
      document.head.appendChild(s);
    });
  }
  private _jspdf(): Promise<void> {
    return this._script('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  private async _pdf(): Promise<any> {
    await this._jspdf();
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const v = this.fg.value;
    const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
    const ML = 20, MT = 14, MB = 12, W = PW - ML * 2, YMAX = PH - MB;
    type C3 = [number, number, number];
    const VINO: C3 = [133, 10, 49], D9: C3 = [217, 217, 217], CC: C3 = [204, 204, 204];
    const WHITE: C3 = [255, 255, 255], BLACK: C3 = [0, 0, 0], GRAY: C3 = [80, 80, 80];
    const cur = { y: MT };

    const npag = () => {
      doc.addPage(); cur.y = 11;
      doc.setFillColor(...D9); doc.rect(ML, cur.y, W, 5.5, 'F');
      doc.setDrawColor(130, 130, 130); doc.setLineWidth(0.25); doc.rect(ML, cur.y, W, 5.5, 'S');
      doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(...VINO);
      doc.text('PLAN DE TRABAJO INDIVIDUALIZADO — RECONECTA CON LA PAZ', PW / 2, cur.y + 3.8, { align: 'center' });
      doc.setTextColor(...BLACK); cur.y += 9;
    };
    const pag = (need: number) => { if (cur.y + need > YMAX) npag(); };
    const altC = (txt: string, w: number, fs = 8.5, minH = 7) => {
      if (!txt) return minH;
      const lines = doc.splitTextToSize(txt, w - 4);
      return Math.max(minH, lines.length * fs * 0.43 + 5);
    };
    const C = (x: number, y: number, w: number, h: number, txt: string, { fill, bold = false, italic = false, align = 'left' as 'left' | 'center' | 'right', fs = 8.5, wrap = false, col = BLACK as C3 }: any = {}) => {
      if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F'); }
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.rect(x, y, w, h, 'S');
      if (!txt) return;
      const st = bold ? (italic ? 'bolditalic' : 'bold') : italic ? 'italic' : 'normal';
      doc.setFontSize(fs).setFont('helvetica', st).setTextColor(...col);
      const pH = 2, ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w - pH : x + pH;
      if (wrap) {
        const lines = doc.splitTextToSize(txt, w - pH * 2), lh = fs * 0.43;
        const sY = y + Math.max(pH + lh, (h - lines.length * lh) / 2 + lh); doc.text(lines, ax, sY, { align });
      }
      else { doc.text(txt, ax, y + h / 2 + (fs * 0.35 / 2), { align }); }
    };
    const F2 = (lbl: string, val: string, wL: number, fillL: C3 = CC, minH = 7.5, wTot = W) => {
      const h = Math.max(minH, altC(val, wTot - wL, 8.5, minH)); pag(h);
      C(ML, cur.y, wL, h, lbl, { fill: fillL, bold: true, fs: 8.5 });
      C(ML + wL, cur.y, wTot - wL, h, val, { fs: 8.5, wrap: true }); cur.y += h;
    };

    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('SEGURIDAD CIUDADANA', ML, cur.y + 5.5);
    doc.setFontSize(5.8).setFont('helvetica', 'normal').setTextColor(...GRAY);
    doc.text('SECRETARIA DE SEGURIDAD', ML, cur.y + 9);
    doc.text('Y PROTECCION', ML, cur.y + 12);
    const xC = ML + 42 + (W - 42) / 2, wC = W - 44;
    doc.setFontSize(7.2).setFont('helvetica', 'bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL', xC, cur.y + 3.5, { align: 'center', maxWidth: wC });
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO Y PARTICIPACION CIUDADANA', xC, cur.y + 7, { align: 'center', maxWidth: wC });
    doc.setFontSize(9.5).setFont('helvetica', 'bold');
    doc.text('PLAN DE TRABAJO INDIVIDUALIZADO', xC, cur.y + 12, { align: 'center', maxWidth: wC });
    doc.setFontSize(7.8).setFont('helvetica', 'normal').setTextColor(...GRAY);
    doc.text('Programa: RECONECTA CON LA PAZ', xC, cur.y + 15.5, { align: 'center', maxWidth: wC });
    cur.y += 21;
    doc.setDrawColor(...VINO); doc.setLineWidth(0.5); doc.line(ML, cur.y, ML + W, cur.y);
    doc.setLineWidth(0.3); cur.y += 5;
    pag(12);
    doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('FICHA TECNICA DE SEGUIMIENTO', PW / 2, cur.y, { align: 'center' });
    cur.y += 10;

    const FOTO_W = 40, FOTO_H = 7.5 * 6 + 8, wT1 = W - FOTO_W - 3, wL1 = wT1 * (2220 / 6579);
    const yFotoStart = cur.y;
    pag(8);
    C(ML, cur.y, wT1, 8, 'DATOS PERSONALES', { fill: D9, bold: true, align: 'center', fs: 9.5 });
    cur.y += 8;
    F2('Nombre', v.nombre || '', wL1, CC, 7.5, wT1);
    F2('Edad', v.edad || '', wL1, CC, 7.5, wT1);
    F2('Municipio', v.municipio || '', wL1, CC, 7.5, wT1);
    F2('Ocupación', v.ocupacion || '', wL1, CC, 7.5, wT1);
    F2('Fecha de Ingreso', v.fechaIngreso || '', wL1, CC, 7.5, wT1);
    F2('Teléfono', v.telefono || '', wL1, CC, 7.5, wT1);
    const xFoto = ML + wT1 + 3, yFoto = yFotoStart;
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.5); doc.rect(xFoto, yFoto, FOTO_W, FOTO_H, 'S');
    if (this.fotoUrl()) {
      try {
        const ext = this.fotoUrl().split(';')[0].split('/')[1]?.toUpperCase() || 'JPEG';
        doc.addImage(this.fotoUrl(), ext, xFoto + 1, yFoto + 1, FOTO_W - 2, FOTO_H - 2);
      }
      catch { doc.setFontSize(7).setTextColor(120, 120, 120); doc.text('FOTO', xFoto + FOTO_W / 2, yFoto + FOTO_H / 2, { align: 'center' }); }
    } else {
      doc.setFillColor(248, 248, 248); doc.rect(xFoto + 0.3, yFoto + 0.3, FOTO_W - 0.6, FOTO_H - 0.6, 'F');
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(180, 180, 180);
      doc.text('FOTO', xFoto + FOTO_W / 2, yFoto + FOTO_H / 2 - 2, { align: 'center' });
    }
    cur.y += 3;

    if (v.periodo || v.fechaInicio || v.fechaFin) {
      const wL_p = W * (2235 / 9630);
      pag(7.5);
      C(ML, cur.y, wL_p, 7.5, 'Período', { fill: CC, bold: true, fs: 8.5 });
      C(ML + wL_p, cur.y, W - wL_p, 7.5,
        `${v.periodo || ''} | Inicio: ${v.fechaInicio || ''} | Fin: ${v.fechaFin || ''}`,
        { fs: 8.5, wrap: true });
      cur.y += 7.5 + 2;
    }

    const wL2 = W * (2235 / 9630);
    const piH = Math.max(20, altC(v.procesoIngreso || '', W - wL2, 8.5, 20));
    pag(piH + 2);
    C(ML, cur.y, wL2, piH, 'Proceso de ingreso a PREVENCIÓN', { fill: CC, bold: true, fs: 8.5, wrap: true });
    C(ML + wL2, cur.y, W - wL2, piH, v.procesoIngreso || '', { fs: 8.5, wrap: true });
    cur.y += piH + 3;

    const wA = W * (2054 / 9804), wO = W - wA;
    pag(8);
    C(ML, cur.y, W, 8, 'PROCESO DE SEGUIMIENTO', { fill: D9, bold: true, align: 'center', fs: 9.5 }); cur.y += 8;
    pag(7);
    C(ML, cur.y, wA, 7, 'ACTIVIDADES', { fill: D9, bold: true, align: 'center', fs: 8.5 });
    C(ML + wA, cur.y, wO, 7, 'OBSERVACIONES', { fill: D9, bold: true, align: 'center', fs: 8.5 }); cur.y += 7;
    ACTIVIDADES_SEG.forEach(a => {
      const obs = v[`${a.key}Obs`] || '';
      const h = Math.max(8, altC(obs, wO, 8.5, 8)); pag(h);
      C(ML, cur.y, wA, h, a.label, { bold: true, align: 'center', fs: 8 });
      C(ML + wA, cur.y, wO, h, obs, { fs: 8.5, wrap: true }); cur.y += h;
    });
    pag(8);
    C(ML, cur.y, W, 8, 'PROYECTO DE VIDA', { fill: CC, bold: true, align: 'center', fs: 9.5 }); cur.y += 8;
    AREAS_VIDA.forEach(a => {
      const obs = v[`vida${cap(a.key)}Obs`] || '';
      const h = Math.max(8, altC(obs, wO, 8.5, 8)); pag(h);
      C(ML, cur.y, wA, h, a.label, { bold: true, align: 'center', fs: 8 });
      C(ML + wA, cur.y, wO, h, obs, { fs: 8.5, wrap: true }); cur.y += h;
    });
    cur.y += 4;

    const cW = [W * (2098 / 10300), W * (2745 / 10300), W * (2820 / 10300), W * (2637 / 10300)];
    pag(13);
    C(ML, cur.y, W, 13, 'Proceso de seguimiento de actividades del programa "RECONECTA CON LA PAZ."',
      { fill: D9, bold: true, italic: true, align: 'center', fs: 9, wrap: true }); cur.y += 13;
    pag(9);
    let xc = ML;
    ['ACTIVIDAD', 'STATUS', 'OBJETIVO', 'CUMPLIMIENTO'].forEach((lbl, i) => {
      C(xc, cur.y, cW[i], 9, lbl, { fill: D9, bold: true, align: 'center', fs: 9 }); xc += cW[i];
    });
    cur.y += 9;
    ACTIVIDADES_PROG.forEach(a => {
      const act = a.label, sta = v[`${a.key}Status`] || '', obj = v[`${a.key}Objetivo`] || '', cum = v[`${a.key}Cumplimiento`] || '';
      const h = Math.max(9, altC(act, cW[0], 8, 9), altC(sta, cW[1], 8, 9), altC(obj, cW[2], 8, 9), altC(cum, cW[3], 8, 9));
      pag(h); let xr = ML;
      [act, sta, obj, cum].forEach((t, i) => {
        C(xr, cur.y, cW[i], h, t, { fill: i === 0 ? CC : undefined, bold: i === 0, align: i === 0 ? 'center' : 'left', fs: 8, wrap: true });
        xr += cW[i];
      }); cur.y += h;
    });
    const obsAll = [v.obsStatus, v.obsObjetivo, v.obsCumplimiento].filter(Boolean).join(' / ');
    const obsH = Math.max(14, altC(obsAll, W - cW[0], 8, 14)); pag(obsH);
    C(ML, cur.y, cW[0], obsH, 'OBSERVACIONES', { fill: CC, bold: true, align: 'center', fs: 8, wrap: true });
    C(ML + cW[0], cur.y, W - cW[0], obsH, obsAll, { fs: 8.5, wrap: true }); cur.y += obsH + 7;

    pag(38);
    const fW = W * 0.42, xL = ML, xR = ML + W - fW;
    doc.setLineWidth(0.4); doc.setDrawColor(...BLACK);
    doc.line(xL, cur.y + 14, xL + fW, cur.y + 14);
    doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(...BLACK);
    doc.text(v.firmaNombre || '________________________________', xL + fW / 2, cur.y + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text(v.firmaCargo || 'RESPONSABLE DEL PROGRAMA', xL + fW / 2, cur.y + 24, { align: 'center' });
    if (v.firmaFecha) doc.text(`Fecha: ${v.firmaFecha}`, xL + fW / 2, cur.y + 29, { align: 'center' });
    doc.line(xR, cur.y + 14, xR + fW, cur.y + 14);
    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('MTRA. LII YIO PEREZ ZARATE', xR + fW / 2, cur.y + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('DIRECTORA DE PREVENCION DEL DELITO', xR + fW / 2, cur.y + 24, { align: 'center' });
    doc.text('Y PARTICIPACION CIUDADANA', xR + fW / 2, cur.y + 29, { align: 'center' });
    const total = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(140, 140, 140);
      doc.text(`${p} / ${total}`, PW / 2, PH - 5, { align: 'center' });
    }
    return doc;
  }

  async descargarPdf(): Promise<void> {
    this.estado.set({ activo: true, pct: 10, fase: 'Iniciando…', exito: false, error: '' });
    this.generando.set(true);
    try {
      this.estado.update(s => ({ ...s, pct: 35, fase: 'Cargando jsPDF…' }));
      const doc = await this._pdf();
      this.estado.update(s => ({ ...s, pct: 92, fase: 'Preparando descarga…' }));
      doc.save(`plan_trabajo_${san(this.fg.value.nombre || 'beneficiario')}.pdf`);
      this.estado.update(s => ({ ...s, pct: 100, fase: '¡PDF descargado!', exito: true }));
      this._finEstado(() => { this.generando.set(false); this.toast$('PDF descargado'); });
    } catch (e: any) {
      this.estado.update(s => ({ ...s, pct: 100, fase: 'Error', error: e?.message || '' }));
      this._finEstado(() => { this.generando.set(false); this.toast$('Error al generar el PDF', 'err'); });
    }
  }

  private _urlToDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private _parseUserIdFromToken(): number | null {
    try {
      const token = localStorage.getItem('access_token') ?? localStorage.getItem('token') ?? sessionStorage.getItem('access_token') ?? sessionStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.sub ?? payload?.id ?? payload?.userId ?? null;
    } catch { return null; }
  }

  private _finEstado(fn: () => void): void {
    setTimeout(() => {
      this.estado.set({ activo: false, pct: 0, fase: '', exito: false, error: '' });
      fn(); this.cdr.markForCheck();
    }, 2200);
  }

  gv(k: string): any { return this.fg?.get(k)?.value; }
  filterJoin(arr: any[], sep = ' / '): string { return arr.filter(v => v).join(sep); }
  icoAdj(tipo: string): string { return tipo?.includes('pdf') ? '📄' : tipo?.includes('image') ? '🖼️' : '📝'; }
  trunc(n: string, m = 22): string { return n.length > m ? n.slice(0, m - 3) + '…' : n; }
  formatFecha(iso: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('es-MX'); } catch { return iso; }
  }
  regresarPantallaAnterior(): void { this.router.navigate(['/expedientes']); }
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function san(s: string): string { return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim(); }