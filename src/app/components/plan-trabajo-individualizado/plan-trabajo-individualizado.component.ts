/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  plan-trabajo-individualizado.component.ts  — v2.0.0               ║
 * ║  Programa "Reconecta con la Paz" — DGPD y PC                       ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  DESCRIPCIÓN                                                         ║
 * ║  Componente Angular 18+ standalone que genera el formulario         ║
 * ║  "Plan de Trabajo Individualizado" con wizard de 6 pasos,           ║
 * ║  vista previa HTML fiel al Word original y descarga en PDF           ║
 * ║  con modelo inteligente de paginación automática.                   ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  ESTRUCTURA DEL PDF (replicación exacta del .docx):                 ║
 * ║                                                                      ║
 * ║  Encabezado:  Logo SEGURIDAD CIUDADANA + títulos institucionales    ║
 * ║  Título:      "FICHA TECNICA DE SEGUIMIENTO"                        ║
 * ║                                                                      ║
 * ║  Tabla 1 — DATOS PERSONALES                                         ║
 * ║    Cabecera: "DATOS PERSONALES"  fill=#d9d9d9                       ║
 * ║    6 filas:  Label(#cccccc, 34%) | Valor(blanco, 66%)               ║
 * ║    Cols Word: 2220 | 4359  → total 6579 dxa                         ║
 * ║                                                                      ║
 * ║  Tabla 2 — PROCESO DE INGRESO A PREVENCIÓN                          ║
 * ║    1 fila:   Label(#cccccc, 23%) | Área de texto(blanco, 77%)       ║
 * ║    Cols Word: 2235 | 7395  → total 9630 dxa                         ║
 * ║                                                                      ║
 * ║  Tabla 3 — PROCESO DE SEGUIMIENTO                                   ║
 * ║    Cab: "PROCESO DE SEGUIMIENTO"  fill=#d9d9d9  (full-width)        ║
 * ║    Sub-cab: ACTIVIDADES | OBSERVACIONES  fill=#d9d9d9               ║
 * ║    5 filas: EDUCATIVA/LABORAL/FAMILIAR/DEPORTIVO/CULTURAL  (blanco) ║
 * ║    Sub-sec: "PROYECTO DE VIDA"  fill=#cccccc  (full-width)          ║
 * ║    3 filas: PERSONAL/FAMILIAR/SOCIAL  (blanco)                      ║
 * ║    Cols Word: 2054 | 7750  → total 9804 dxa                         ║
 * ║                                                                      ║
 * ║  Tabla 4 — SEGUIMIENTO DEL PROGRAMA                                 ║
 * ║    Título:  "Proceso de seguimiento…"  fill=#d9d9d9  (bold+italic)  ║
 * ║    Cab 4col: ACTIVIDAD|STATUS|OBJETIVO|CUMPLIMIENTO  fill=#d9d9d9   ║
 * ║    8 filas: Act(#cccccc)|Status|Obj|Cumpl  (blanco)                 ║
 * ║    Obs:     OBSERVACIONES(#cccccc) | texto(colspan 3)               ║
 * ║    Cols Word: 2098|2745|2820|2637 → total 10300 dxa                 ║
 * ║                                                                      ║
 * ║  Firmas:  2 columnas centradas                                       ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  MODELO INTELIGENTE DE PAGINACIÓN                                    ║
 * ║  – cur = {y:number}  cursor compartido por TODOS los helpers        ║
 * ║  – altCelda()  pre-calcula altura ANTES de dibujar                  ║
 * ║  – pag(need)   inserta nueva página si cur.y+need > YMAX            ║
 * ║  – Tabla 4 completa se evalúa como bloque único para evitar         ║
 * ║    cortes de página a mitad de la tabla                              ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  TECNOLOGÍAS                                                         ║
 * ║  Angular 18+ · Standalone · Signals · OnPush · ReactiveFormsModule  ║
 * ║  jsPDF 2.5.1 (CDN) · JSZip 3.10.1 (CDN)                            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * @version  2.0.0
 * @requires Angular 18+
 * @requires jsPDF   https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 * @requires JSZip   https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
 */

import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }          from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router }                from '@angular/router';
import { Subject }               from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// ════════════════════════════════════════════════════════════════
//  INTERFACES
// ════════════════════════════════════════════════════════════════

/** Archivo adjunto cargado por el usuario. */
export interface Adjunto {
  id:      number;
  nombre:  string;
  tamano:  number;
  tipo:    string;
  dataUrl: string;
}

/** Entrada del historial de sesión. */
export interface Expediente {
  id:        number;
  nombre:    string;
  municipio: string;
  fecha:     string;
  pdf:       { nombre: string; dataUrl: string };
  archivos:  Adjunto[];
}

/** Estado del overlay de progreso. */
export interface EstadoPdf {
  activo: boolean;
  pct:    number;
  fase:   string;
  exito:  boolean;
  error:  string;
}

/** Definición de cada paso del wizard. */
export interface Paso {
  titulo:      string;
  desc:        string;
  icono:       string;
  color:       string;
  requeridos:  string[];    // claves de campos obligatorios en este paso
}

// ════════════════════════════════════════════════════════════════
//  CONSTANTES — Configuración del formulario y el documento
// ════════════════════════════════════════════════════════════════

/**
 * Definición de los 6 pasos del wizard.
 * Solo el campo "nombre" es obligatorio para generar el PDF.
 */
export const PASOS_WIZARD: Paso[] = [
  { titulo:'Datos Personales',     desc:'Información básica del beneficiario',            icono:'👤', color:'#850a31', requeridos:['nombre'] },
  { titulo:'Proceso de Ingreso',   desc:'Descripción del proceso de ingreso a PREVENCIÓN',icono:'📝', color:'#1a5276', requeridos:[] },
  { titulo:'Seguimiento',          desc:'Actividades de seguimiento por área clave',      icono:'🔄', color:'#145a32', requeridos:[] },
  { titulo:'Proyecto de Vida',     desc:'Metas personales, familiares y sociales',        icono:'🎯', color:'#6c3483', requeridos:[] },
  { titulo:'Actividades Programa', desc:'Status, objetivos y cumplimiento — RECONECTA',  icono:'✅', color:'#784212', requeridos:[] },
  { titulo:'Adjuntos y Firma',     desc:'Documentos adjuntos y datos del firmante',      icono:'✍️', color:'#1b2631', requeridos:[] },
];

/** Todos los campos obligatorios del formulario. */
export const CAMPOS_OBLIGATORIOS = PASOS_WIZARD.flatMap(p => p.requeridos);

/**
 * Actividades de la TABLA 3 — PROCESO DE SEGUIMIENTO.
 * Colores del Word: blanco (auto).
 */
export const ACTIVIDADES_SEG = [
  { key:'educativa',  label:'EDUCATIVA'  },
  { key:'laboral',    label:'LABORAL'    },
  { key:'familiar',   label:'FAMILIAR'   },
  { key:'deportivo',  label:'DEPORTIVO'  },
  { key:'cultural',   label:'CULTURAL'   },
] as const;

/**
 * Áreas del sub-bloque PROYECTO DE VIDA (dentro de Tabla 3).
 * Color cabecera: #cccccc.
 */
export const AREAS_VIDA = [
  { key:'personal', label:'PERSONAL' },
  { key:'familiar', label:'FAMILIAR' },
  { key:'social',   label:'SOCIAL'   },
] as const;

/**
 * Actividades de la TABLA 4 — Seguimiento del programa.
 * Columnas: ACTIVIDAD | STATUS | OBJETIVO | CUMPLIMIENTO
 * Color cabecera actividad: #cccccc.
 */
export const ACTIVIDADES_PROG = [
  { key:'pEducativa',   label:'EDUCATIVA'              },
  { key:'pPsicosocial', label:'PSICOSOCIAL / RED APOYO' },
  { key:'pPsicologica', label:'PSICOLÓGICA'            },
  { key:'pAdicciones',  label:'ADICCIONES'             },
  { key:'pFamiliar',    label:'FAMILIAR'               },
  { key:'pLaboral',     label:'LABORAL'                },
  { key:'pDeportiva',   label:'DEPORTIVA'              },
  { key:'pCultural',    label:'CULTURAL'               },
] as const;

// ════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

@Component({
  selector:         'app-plan-trabajo-individualizado',
  standalone:       true,
  imports:          [CommonModule, ReactiveFormsModule],
  templateUrl:      './plan-trabajo-individualizado.component.html',
  styleUrls:        ['./plan-trabajo-individualizado.component.css'],
  changeDetection:  ChangeDetectionStrategy.OnPush,
})
export class PlanTrabajoIndividualizadoComponent implements OnInit, OnDestroy {

  // ── Inyección de dependencias ────────────────────────────────
  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  // ════════════════════════════════════════════════════════════
  //  SIGNALS — toda la UI depende de estos signals
  // ════════════════════════════════════════════════════════════

  /** Tab activo (formulario / historial) */
  readonly tabActivo          = signal<'form'|'hist'>('form');

  /** Paso actual del wizard (0-based, 0..5) */
  readonly paso               = signal(0);

  /** Controla la visibilidad del overlay de vista previa */
  readonly verPrevia          = signal(false);

  /** Lista de archivos adjuntos del formulario actual */
  readonly adjuntos           = signal<Adjunto[]>([]);

  /** Historial en sesión de expedientes guardados */
  readonly historial          = signal<Expediente[]>([]);

  /** Notificación tipo toast */
  readonly toast              = signal<{msg:string; tipo:string}>({msg:'',tipo:''});

  /** Estado del overlay de progreso (generación PDF / ZIP) */
  readonly estado             = signal<EstadoPdf>({activo:false,pct:0,fase:'',exito:false,error:''});

  /** True mientras hay un archivo arrastrándose sobre la zona de carga */
  readonly dragging           = signal(false);

  /** True mientras se genera el PDF de descarga */
  readonly generando          = signal(false);

  /** True mientras se guarda en historial */
  readonly guardando          = signal(false);

  /** Porcentaje de completitud del formulario completo (0-100) */
  readonly pct                = signal(0);

  /** Controla la animación de entrada de cada paso */
  readonly slideOut           = signal(false);

  /**
   * Data URL de la foto del beneficiario.
   * '' = sin foto cargada → en el PDF se dibuja un recuadro vacío.
   * Si tiene valor → se incrusta la imagen en el PDF.
   */
  readonly fotoUrl            = signal<string>('');

  // ════════════════════════════════════════════════════════════
  //  COMPUTED — derivados
  // ════════════════════════════════════════════════════════════

  /** True si todos los campos obligatorios están llenos */
  readonly completo = computed(() =>
    CAMPOS_OBLIGATORIOS.every(k => { const v = this.fg?.value?.[k]; return v && v !== ''; })
  );

  readonly totalHistorial = computed(() => this.historial().length);
  readonly pendientes     = computed(() =>
    CAMPOS_OBLIGATORIOS.filter(k => { const v = this.fg?.value?.[k]; return !v || v === ''; })
  );

  // ── FormGroup ─────────────────────────────────────────────────
  fg!: FormGroup;

  // ── Datos expuestos al template ────────────────────────────────
  readonly PASOS  = PASOS_WIZARD;
  readonly ASEG   = ACTIVIDADES_SEG;
  readonly AVIDA  = AREAS_VIDA;
  readonly APROG  = ACTIVIDADES_PROG;

  private readonly destroy$ = new Subject<void>();

  // ════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this._buildForm();
    this._watchPct();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ════════════════════════════════════════════════════════════
  //  FORMULARIO REACTIVO
  //
  //  Controles generados dinámicamente:
  //   – Tabla 3:  {key}Obs  para cada actividad de seguimiento
  //   – Tabla 3:  vida{Key}Obs  para cada área de proyecto de vida
  //   – Tabla 4:  {key}Status / {key}Objetivo / {key}Cumplimiento
  // ════════════════════════════════════════════════════════════

  private _buildForm(): void {
    // Tabla 3 — seguimiento
    const seg: Record<string,any> = {};
    ACTIVIDADES_SEG.forEach(a => { seg[`${a.key}Obs`] = ['']; });

    // Tabla 3 — proyecto de vida
    const vida: Record<string,any> = {};
    AREAS_VIDA.forEach(a => { vida[`vida${cap(a.key)}Obs`] = ['']; });

    // Tabla 4 — actividades programa
    const prog: Record<string,any> = {};
    ACTIVIDADES_PROG.forEach(a => {
      prog[`${a.key}Status`]       = [''];
      prog[`${a.key}Objetivo`]     = [''];
      prog[`${a.key}Cumplimiento`] = [''];
    });

    this.fg = this.fb.group({
      // Tabla 1 — Datos Personales
      nombre:       ['', Validators.required],
      edad:         [''],
      municipio:    [''],
      ocupacion:    [''],
      fechaIngreso: [''],
      telefono:     [''],
      // Tabla 2 — Proceso de ingreso
      procesoIngreso: [''],
      // Tabla 3
      ...seg, ...vida,
      // Tabla 4
      ...prog,
      obsStatus:       [''],
      obsObjetivo:     [''],
      obsCumplimiento: [''],
      // Firmas
      firmaNombre: [''],
      firmaCargo:  [''],
      firmaFecha:  [''],
    });
  }

  /** Suscribe cambios del formulario para actualizar la barra de progreso. */
  private _watchPct(): void {
    const calc = () => {
      const v = this.fg?.value ?? {};
      const n = CAMPOS_OBLIGATORIOS.filter(k => v[k] && v[k] !== '').length;
      this.pct.set(CAMPOS_OBLIGATORIOS.length ? Math.round((n / CAMPOS_OBLIGATORIOS.length) * 100) : 100);
    };
    calc();
    this.fg.valueChanges.pipe(takeUntil(this.destroy$), debounceTime(80)).subscribe(calc);
  }

  // ════════════════════════════════════════════════════════════
  //  NAVEGACIÓN WIZARD
  // ════════════════════════════════════════════════════════════

  siguiente(): void {
    if (this.paso() < PASOS_WIZARD.length - 1) this._navegar(() => this.paso.update(p => p + 1));
  }
  anterior(): void {
    if (this.paso() > 0) this._navegar(() => this.paso.update(p => p - 1));
  }
  irA(i: number): void { this._navegar(() => this.paso.set(i)); }

  private _navegar(fn: () => void): void {
    this.slideOut.set(true);
    setTimeout(() => { fn(); this.slideOut.set(false); this.cdr.markForCheck(); }, 200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Porcentaje de completitud de un paso específico. */
  pctPaso(i: number): number {
    const r = PASOS_WIZARD[i]?.requeridos ?? [];
    if (!r.length) return 100;
    const v = this.fg?.value ?? {};
    return Math.round((r.filter(k => v[k] && v[k] !== '').length / r.length) * 100);
  }
  pasoDone(i: number): boolean { return this.pctPaso(i) === 100; }

  // ════════════════════════════════════════════════════════════
  //  ARCHIVOS ADJUNTOS
  // ════════════════════════════════════════════════════════════

  onFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        this.adjuntos.update(a => [...a, {
          id: Date.now() + Math.random(), nombre: f.name,
          tamano: f.size, tipo: f.type, dataUrl: e.target!.result as string,
        }]);
        this.cdr.markForCheck();
      };
      r.readAsDataURL(f);
    });
  }

  quitarAdj(id: number): void { this.adjuntos.update(a => a.filter(x => x.id !== id)); }

  // ════════════════════════════════════════════════════════════
  //  FOTO DEL BENEFICIARIO
  //
  //  Se almacena como dataUrl en el signal fotoUrl.
  //  Si está vacío → en el PDF se dibuja un recuadro vacío
  //                  con texto "FOTO" para pegar después.
  //  Si tiene valor → se incrusta en el PDF con doc.addImage().
  // ════════════════════════════════════════════════════════════

  cargarFoto(file: File | null): void {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => {
      this.fotoUrl.set(e.target!.result as string);
      this.cdr.markForCheck();
    };
    r.readAsDataURL(file);
  }

  quitarFoto(): void { this.fotoUrl.set(''); }

  // ════════════════════════════════════════════════════════════
  //  TOAST
  // ════════════════════════════════════════════════════════════

  toast$(msg: string, tipo: 'ok'|'err' = 'ok'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => { this.toast.set({ msg: '', tipo: '' }); this.cdr.markForCheck(); }, 3500);
  }

  // ════════════════════════════════════════════════════════════
  //  CARGA DINÁMICA DE LIBRERÍAS CDN
  // ════════════════════════════════════════════════════════════

  private _script(id: string, src: string): Promise<void> {
    return new Promise((ok, err) => {
      if (document.getElementById(id)) return ok();
      const s = Object.assign(document.createElement('script'), { id, src });
      s.onload  = () => ok();
      s.onerror = () => err(new Error(`No se pudo cargar: ${src}`));
      document.head.appendChild(s);
    });
  }

  private _jspdf(): Promise<void> {
    return this._script('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  private _jszip(): Promise<void> {
    return this._script('jszip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }

  // ════════════════════════════════════════════════════════════
  //  GENERACIÓN DE PDF — MODELO INTELIGENTE DE PAGINACIÓN
  //
  //  ┌──────────────────────────────────────────────────────┐
  //  │  PRINCIPIO: cursor compartido cur = { y: number }    │
  //  │                                                      │
  //  │  TODOS los helpers leen/escriben cur.y directamente. │
  //  │  Ninguno acepta ni retorna posición Y — solo usan    │
  //  │  el objeto compartido.                               │
  //  │                                                      │
  //  │  pag(n)    → si cur.y + n > YMAX → nuevaPagina()    │
  //  │  altC(txt) → calcula altura de celda SIN dibujar     │
  //  │  C(...)    → dibuja una celda en (x, cur.y)          │
  //  │  F2(...)   → fila 2 columnas, avanza cur.y           │
  //  │  F4(...)   → fila 4 columnas, avanza cur.y           │
  //  └──────────────────────────────────────────────────────┘
  //
  //  DIMENSIONES DEL WORD:
  //   Página Letter 215.9 × 279.4 mm
  //   Márgenes: top/bottom 1417 twips ≈ 25mm
  //             left/right 1701 twips ≈ 30mm  (usamos 20mm para + espacio)
  //   Área útil: W ≈ 175.9 mm
  //
  //  COLORES EXACTOS DEL XML DEL DOCX:
  //   #d9d9d9 → [217,217,217] — cabeceras principales
  //   #cccccc → [204,204,204] — labels y sub-secciones
  //   blanco  → celdas de valor
  // ════════════════════════════════════════════════════════════

  private async _pdf(): Promise<any> {
    await this._jspdf();
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const v   = this.fg.value;

    // ── Dimensiones ───────────────────────────────────────────
    const PW   = doc.internal.pageSize.getWidth();   // 215.9
    const PH   = doc.internal.pageSize.getHeight();  // 279.4
    const ML   = 20;                   // margen izq/der
    const MT   = 14;                   // margen superior p.1
    const MB   = 12;                   // margen inferior
    const W    = PW - ML * 2;          // ≈ 175.9 mm
    const YMAX = PH - MB;

    // ── Colores ───────────────────────────────────────────────
    type C3 = [number,number,number];
    const VINO:  C3 = [133, 10, 49];
    const D9:    C3 = [217,217,217];   // #d9d9d9
    const CC:    C3 = [204,204,204];   // #cccccc
    const WHITE: C3 = [255,255,255];
    const BLACK: C3 = [0,0,0];
    const GRAY:  C3 = [80,80,80];

    // ── Cursor compartido ─────────────────────────────────────
    const cur = { y: MT };

    // ── Nueva página con mini-encabezado ──────────────────────
    const npag = (): void => {
      doc.addPage(); cur.y = 11;
      doc.setFillColor(...D9); doc.rect(ML, cur.y, W, 5.5, 'F');
      doc.setDrawColor(130,130,130); doc.setLineWidth(0.25);
      doc.rect(ML, cur.y, W, 5.5, 'S');
      doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...VINO);
      doc.text('PLAN DE TRABAJO INDIVIDUALIZADO — RECONECTA CON LA PAZ — DGPD y PC',
        PW/2, cur.y+3.8, {align:'center'});
      doc.setTextColor(...BLACK); cur.y += 9;
    };

    // ── Paginación preventiva ─────────────────────────────────
    const pag = (need: number): void => { if (cur.y+need > YMAX) npag(); };

    // ── Pre-calcular altura de celda (para tomar decisiones ANTES de dibujar)
    const altC = (txt: string, w: number, fs = 8.5, minH = 7): number => {
      if (!txt) return minH;
      const lines = doc.splitTextToSize(txt, w - 4);
      return Math.max(minH, lines.length * fs * 0.43 + 5);
    };

    // ── Dibujar una celda individual ──────────────────────────
    const C = (
      x: number, y: number, w: number, h: number, txt: string,
      {
        fill, bold=false, italic=false,
        align='left' as 'left'|'center'|'right',
        fs=8.5, wrap=false, col=BLACK as C3,
      }: {
        fill?: C3; bold?: boolean; italic?: boolean;
        align?: 'left'|'center'|'right';
        fs?: number; wrap?: boolean; col?: C3;
      } = {}
    ): void => {
      if (fill) { doc.setFillColor(...fill); doc.rect(x,y,w,h,'F'); }
      doc.setDrawColor(100,100,100); doc.setLineWidth(0.3);
      doc.rect(x,y,w,h,'S');
      if (!txt) return;
      const st = bold ? (italic?'bolditalic':'bold') : italic?'italic':'normal';
      doc.setFontSize(fs).setFont('helvetica', st).setTextColor(...col);
      const pH=2, ax = align==='center'?x+w/2 : align==='right'?x+w-pH : x+pH;
      if (wrap) {
        const lines = doc.splitTextToSize(txt, w-pH*2);
        const lh    = fs*0.43;
        const sY    = y + Math.max(pH+lh, (h-lines.length*lh)/2+lh);
        doc.text(lines, ax, sY, {align});
      } else {
        doc.text(txt, ax, y+h/2+(fs*0.35/2), {align});
      }
    };

    // ── Fila 2 columnas label|valor — avanza cur.y ────────────
    const F2 = (lbl: string, val: string, wL: number, fillL: C3 = CC, minH = 7.5, wTot = W): void => {
      const h = Math.max(minH, altC(val, wTot-wL, 8.5, minH));
      pag(h);
      C(ML,     cur.y, wL,      h, lbl, {fill:fillL, bold:true, fs:8.5});
      C(ML+wL,  cur.y, wTot-wL, h, val, {fs:8.5, wrap:true});
      cur.y += h;
    };

    // ── Fila 4 columnas Tabla 4 — avanza cur.y ────────────────
    const F4 = (act: string, sta: string, obj: string, cum: string, cW: number[]): void => {
      const h = Math.max(9,
        altC(act, cW[0],8,9), altC(sta, cW[1],8,9),
        altC(obj, cW[2],8,9), altC(cum, cW[3],8,9)
      );
      pag(h);
      let xc = ML;
      [act,sta,obj,cum].forEach((t,i) => {
        C(xc, cur.y, cW[i], h, t, {
          fill: i===0 ? CC : undefined,
          bold: i===0, align: i===0?'center':'left',
          fs:8, wrap:true,
        });
        xc += cW[i];
      });
      cur.y += h;
    };

    // ════════════════════════════════════════════════════════════
    //  ENCABEZADO INSTITUCIONAL — misma estructura 3 zonas
    // ════════════════════════════════════════════════════════════

    // Zona A: logo + nombre izquierda
    doc.setFontSize(11).setFont('helvetica','bold').setTextColor(...VINO);
    doc.text('SEGURIDAD CIUDADANA', ML, cur.y+5.5);
    doc.setFontSize(5.8).setFont('helvetica','normal').setTextColor(...GRAY);
    doc.text('SECRETARIA DE SEGURIDAD', ML, cur.y+9);
    doc.text('Y PROTECCION', ML, cur.y+12);

    // Zona B: títulos centrados
    const xC = ML+42+(W-42)/2, wC = W-44;
    doc.setFontSize(7.2).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL',
      xC, cur.y+3.5, {align:'center', maxWidth:wC});
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO Y PARTICIPACION CIUDADANA',
      xC, cur.y+7, {align:'center', maxWidth:wC});
    doc.setFontSize(9.5).setFont('helvetica','bold');
    doc.text('PLAN DE TRABAJO INDIVIDUALIZADO', xC, cur.y+12, {align:'center', maxWidth:wC});
    doc.setFontSize(7.8).setFont('helvetica','normal').setTextColor(...GRAY);
    doc.text('Programa: RECONECTA CON LA PAZ', xC, cur.y+15.5, {align:'center', maxWidth:wC});

    cur.y += 21;
    doc.setDrawColor(...VINO); doc.setLineWidth(0.5);
    doc.line(ML, cur.y, ML+W, cur.y);
    doc.setLineWidth(0.3); cur.y += 5;

    // Título "FICHA TECNICA DE SEGUIMIENTO"
    pag(12);
    doc.setFontSize(13).setFont('helvetica','bold').setTextColor(...VINO);
    doc.text('FICHA TECNICA DE SEGUIMIENTO', PW/2, cur.y, {align:'center'});
    cur.y += 10;

    // ════════════════════════════════════════════════════════════
    //  TABLA 1 — DATOS PERSONALES  +  FOTO DEL BENEFICIARIO
    //
    //  Diseño igual al Word original:
    //  ┌─────────────────────────────────┬──────────────────┐
    //  │ DATOS PERSONALES (header full)  │                  │
    //  ├───────────┬─────────────────────┤  FOTO (recuadro) │
    //  │ label(cc) │ valor               │  45mm × 55mm     │
    //  │ ...x6     │ ...                 │                  │
    //  └───────────┴─────────────────────┴──────────────────┘
    //
    //  Word cols: 2220 | 4359  → wL = 2220/6579 ≈ 33.7%
    //  Foto: ancho fijo 40mm, altura = 6 filas * 7.5mm = 45mm
    //  La foto va a la DERECHA de la tabla, alineada al top.
    //
    //  Si fotoUrl tiene valor → se incrusta con doc.addImage()
    //  Si fotoUrl vacío      → recuadro con texto "FOTO" en gris
    // ════════════════════════════════════════════════════════════

    const FOTO_W  = 40;                  // ancho del recuadro foto (mm)
    const FOTO_H  = 7.5 * 6 + 8;        // alto: cabecera(8) + 6 filas × 7.5
    const wT1     = W - FOTO_W - 3;     // ancho de la tabla de datos
    const wL1     = wT1 * (2220/6579);  // ≈ 33.7% de wT1

    // Guardar Y de inicio para alinear foto
    const yFotoStart = cur.y;

    // Cabecera "DATOS PERSONALES" (span completo de la tabla, sin foto)
    pag(8);
    C(ML, cur.y, wT1, 8, 'DATOS PERSONALES', {fill:D9, bold:true, align:'center', fs:9.5});
    cur.y += 8;

    // 6 filas de datos personales — pasan wT1 como ancho total de la tabla
    F2('Nombre',          v.nombre        || '', wL1, CC, 7.5, wT1);
    F2('Edad',            v.edad          || '', wL1, CC, 7.5, wT1);
    F2('Municipio',       v.municipio     || '', wL1, CC, 7.5, wT1);
    F2('Ocupación',       v.ocupacion     || '', wL1, CC, 7.5, wT1);
    F2('Fecha de Ingreso',v.fechaIngreso  || '', wL1, CC, 7.5, wT1);
    F2('Teléfono',        v.telefono      || '', wL1, CC, 7.5, wT1);

    // ── RECUADRO DE FOTO (derecha, alineado al top de la tabla) ──
    const xFoto = ML + wT1 + 3;    // 3mm de separación
    const yFoto = yFotoStart;
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.5);
    doc.rect(xFoto, yFoto, FOTO_W, FOTO_H, 'S');

    if (this.fotoUrl()) {
      // Foto cargada → incrustar imagen centrada dentro del recuadro
      try {
        const ext = this.fotoUrl().split(';')[0].split('/')[1]?.toUpperCase() || 'JPEG';
        doc.addImage(this.fotoUrl(), ext, xFoto+1, yFoto+1, FOTO_W-2, FOTO_H-2);
      } catch {
        // Si falla incrustar, dibujar placeholder
        doc.setFillColor(230, 230, 230);
        doc.rect(xFoto+1, yFoto+1, FOTO_W-2, FOTO_H-2, 'F');
        doc.setFontSize(7).setFont('helvetica','normal').setTextColor(120,120,120);
        doc.text('FOTO', xFoto + FOTO_W/2, yFoto + FOTO_H/2, {align:'center'});
      }
    } else {
      // Sin foto → fondo gris muy claro + texto "FOTO" centrado
      doc.setFillColor(248, 248, 248);
      doc.rect(xFoto+0.3, yFoto+0.3, FOTO_W-0.6, FOTO_H-0.6, 'F');
      // Ícono de persona / placeholder
      doc.setFontSize(9).setFont('helvetica','normal').setTextColor(180,180,180);
      doc.text('FOTO', xFoto + FOTO_W/2, yFoto + FOTO_H/2 - 2, {align:'center'});
      doc.setFontSize(6.5).setTextColor(200,200,200);
      doc.text('del beneficiario', xFoto + FOTO_W/2, yFoto + FOTO_H/2 + 4, {align:'center'});
    }

    cur.y += 3;

    // ════════════════════════════════════════════════════════════
    //  TABLA 2 — PROCESO DE INGRESO A PREVENCIÓN
    //  Word cols: 2235 | 7395  → wL = 2235/9630 ≈ 23.2%
    //  Label: fill=#cccccc
    // ════════════════════════════════════════════════════════════

    const wL2 = W * (2235/9630);
    const piH = Math.max(20, altC(v.procesoIngreso||'', W-wL2, 8.5, 20));
    pag(piH+2);
    C(ML,     cur.y, wL2,   piH, 'Proceso de ingreso a PREVENCIÓN',
      {fill:CC, bold:true, fs:8.5, wrap:true});
    C(ML+wL2, cur.y, W-wL2, piH, v.procesoIngreso||'', {fs:8.5, wrap:true});
    cur.y += piH + 3;

    // ════════════════════════════════════════════════════════════
    //  TABLA 3 — PROCESO DE SEGUIMIENTO
    //  Word cols: 2054 | 7750  → wA = 2054/9804 ≈ 20.9%
    //  Cabecera "PROCESO DE SEGUIMIENTO":  fill=#d9d9d9
    //  Sub-cabecera ACTIVIDADES|OBSERVACIONES: fill=#d9d9d9
    //  Filas actividades: fill=blanco (auto)
    //  "PROYECTO DE VIDA":  fill=#cccccc
    //  Filas Personal/Familiar/Social: fill=blanco (auto)
    // ════════════════════════════════════════════════════════════

    const wA = W * (2054/9804);
    const wO = W - wA;

    pag(8);
    C(ML, cur.y, W, 8, 'PROCESO DE SEGUIMIENTO', {fill:D9, bold:true, align:'center', fs:9.5});
    cur.y += 8;

    pag(7);
    C(ML,    cur.y, wA, 7, 'ACTIVIDADES',  {fill:D9, bold:true, align:'center', fs:8.5});
    C(ML+wA, cur.y, wO, 7, 'OBSERVACIONES',{fill:D9, bold:true, align:'center', fs:8.5});
    cur.y += 7;

    // Filas Educativa … Cultural (fondo blanco)
    ACTIVIDADES_SEG.forEach(a => {
      const obs = v[`${a.key}Obs`] || '';
      const h   = Math.max(8, altC(obs, wO, 8.5, 8));
      pag(h);
      C(ML,    cur.y, wA, h, a.label, {bold:true, align:'center', fs:8});
      C(ML+wA, cur.y, wO, h, obs,     {fs:8.5, wrap:true});
      cur.y += h;
    });

    // Sub-sección PROYECTO DE VIDA (fill=#cccccc)
    pag(8);
    C(ML, cur.y, W, 8, 'PROYECTO DE VIDA', {fill:CC, bold:true, align:'center', fs:9.5});
    cur.y += 8;

    AREAS_VIDA.forEach(a => {
      const obs = v[`vida${cap(a.key)}Obs`] || '';
      const h   = Math.max(8, altC(obs, wO, 8.5, 8));
      pag(h);
      C(ML,    cur.y, wA, h, a.label, {bold:true, align:'center', fs:8});
      C(ML+wA, cur.y, wO, h, obs,     {fs:8.5, wrap:true});
      cur.y += h;
    });

    cur.y += 4;

    // ════════════════════════════════════════════════════════════
    //  TABLA 4 — SEGUIMIENTO DE ACTIVIDADES DEL PROGRAMA
    //
    //  PROPORCIONES EXACTAS DEL WORD XML:
    //    ACTIVIDAD:    2098/10300 = 20.37%
    //    STATUS:       2745/10300 = 26.65%
    //    OBJETIVO:     2820/10300 = 27.38%
    //    CUMPLIMIENTO: 2637/10300 = 25.60%
    //
    //  ALGORITMO INTELIGENTE:
    //    1. Calcula altura estimada de TODA la tabla
    //    2. Si NO cabe completa → inserta nueva página ANTES
    //    3. Cada fila además verifica individualmente
    //
    //  Cabeceras: fill=#d9d9d9
    //  Col Actividad: fill=#cccccc
    //  Resto celdas: blanco
    // ════════════════════════════════════════════════════════════

    const cW: number[] = [
      W*(2098/10300),  // ACTIVIDAD    20.4%
      W*(2745/10300),  // STATUS       26.7%
      W*(2820/10300),  // OBJETIVO     27.4%
      W*(2637/10300),  // CUMPLIMIENTO 25.6%
    ];

    // Estimar altura total de Tabla 4 antes de dibujar
    const altT4 = ACTIVIDADES_PROG.reduce((acc,a) => acc + Math.max(9,
      altC(a.label,               cW[0],8,9),
      altC(v[`${a.key}Status`]||'',    cW[1],8,9),
      altC(v[`${a.key}Objetivo`]||'',  cW[2],8,9),
      altC(v[`${a.key}Cumplimiento`]||'',cW[3],8,9)
    ), 0) + 13 + 9; // título + cabeceras

    // Si la tabla no cabe entera → nueva página
    if (cur.y + altT4 > YMAX) npag();

    // Título Tabla 4 (bold+italic, fill=#d9d9d9)
    pag(13);
    C(ML, cur.y, W, 13,
      'Proceso de seguimiento de actividades del programa "RECONECTA CON LA PAZ."',
      {fill:D9, bold:true, italic:true, align:'center', fs:9, wrap:true});
    cur.y += 13;

    // Cabeceras 4 columnas (fill=#d9d9d9)
    pag(9);
    let xc = ML;
    ['ACTIVIDAD','STATUS','OBJETIVO','CUMPLIMIENTO'].forEach((lbl,i) => {
      C(xc, cur.y, cW[i], 9, lbl, {fill:D9, bold:true, align:'center', fs:9});
      xc += cW[i];
    });
    cur.y += 9;

    // Filas de actividades
    ACTIVIDADES_PROG.forEach(a => {
      F4(
        a.label,
        v[`${a.key}Status`]       || '',
        v[`${a.key}Objetivo`]     || '',
        v[`${a.key}Cumplimiento`] || '',
        cW
      );
    });

    // Fila OBSERVACIONES (label #cccccc + colspan 3)
    const obsAll = [v.obsStatus, v.obsObjetivo, v.obsCumplimiento].filter(Boolean).join(' / ');
    const obsH   = Math.max(14, altC(obsAll, W-cW[0], 8, 14));
    pag(obsH);
    C(ML,        cur.y, cW[0],   obsH, 'OBSERVACIONES',
      {fill:CC, bold:true, align:'center', fs:8, wrap:true});
    C(ML+cW[0],  cur.y, W-cW[0], obsH, obsAll,
      {fs:8.5, wrap:true});
    cur.y += obsH + 7;

    // ════════════════════════════════════════════════════════════
    //  FIRMAS
    // ════════════════════════════════════════════════════════════

    pag(38);
    const fW = W*0.42, xL = ML, xR = ML+W-fW;

    doc.setLineWidth(0.4); doc.setDrawColor(...BLACK);
    doc.line(xL, cur.y+14, xL+fW, cur.y+14);
    doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text(v.firmaNombre || '________________________________', xL+fW/2, cur.y+19, {align:'center'});
    doc.setFont('helvetica','normal').setFontSize(8);
    doc.text(v.firmaCargo  || 'RESPONSABLE DEL PROGRAMA', xL+fW/2, cur.y+24, {align:'center'});
    if (v.firmaFecha) doc.text(`Fecha: ${v.firmaFecha}`, xL+fW/2, cur.y+29, {align:'center'});

    doc.line(xR, cur.y+14, xR+fW, cur.y+14);
    doc.setFont('helvetica','bold').setFontSize(8.5);
    doc.text('MTRA. LII YIO PEREZ ZARATE',                 xR+fW/2, cur.y+19, {align:'center'});
    doc.setFont('helvetica','normal').setFontSize(8);
    doc.text('DIRECTORA DE PREVENCION DEL DELITO',          xR+fW/2, cur.y+24, {align:'center'});
    doc.text('Y PARTICIPACION CIUDADANA',                   xR+fW/2, cur.y+29, {align:'center'});
    doc.setLineWidth(0.2);

    // Numeración de páginas
    const total = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(140,140,140);
      doc.text(`${p} / ${total}`, PW/2, PH-5, {align:'center'});
    }
    return doc;
  }

  // ════════════════════════════════════════════════════════════
  //  ACCIONES PÚBLICAS — Descarga y guardado
  // ════════════════════════════════════════════════════════════

  async descargarPdf(): Promise<void> {
    this.estado.set({activo:true,pct:10,fase:'Iniciando…',exito:false,error:''});
    this.generando.set(true);
    try {
      this.estado.update(s => ({...s,pct:35,fase:'Cargando jsPDF…'}));
      const doc = await this._pdf();
      this.estado.update(s => ({...s,pct:92,fase:'Preparando descarga…'}));
      doc.save(`plan_trabajo_${san(this.fg.value.nombre||'beneficiario')}.pdf`);
      this.estado.update(s => ({...s,pct:100,fase:'¡PDF descargado!',exito:true}));
      this._finEstado(() => { this.generando.set(false); this.toast$('PDF descargado'); });
    } catch(e: any) {
      this.estado.update(s => ({...s,pct:100,fase:'Error',error:e?.message||''}));
      this._finEstado(() => { this.generando.set(false); this.toast$('Error al generar el PDF','err'); });
    }
  }

  async guardar(): Promise<void> {
    this.estado.set({activo:true,pct:5,fase:'Preparando expediente…',exito:false,error:''});
    this.guardando.set(true);
    try {
      this.estado.update(s => ({...s,pct:30,fase:'Generando PDF…'}));
      const doc   = await this._pdf();
      const dUrl  = doc.output('datauristring');
      const fg    = this.fg.value;
      const nom   = fg.nombre || 'SIN-NOMBRE';
      const pNom  = `PLAN-TRABAJO_${san(nom)}.pdf`;

      const e: Expediente = {
        id: Date.now(), nombre: nom,
        municipio: fg.municipio || '',
        fecha: new Date().toLocaleDateString('es-MX'),
        pdf: { nombre: pNom, dataUrl: dUrl },
        archivos: [...this.adjuntos()],
      };

      this.historial.update(h => {
        const i = h.findIndex(x => x.nombre === nom);
        if (i >= 0) { const c = [...h]; c[i] = {...c[i],...e,archivos:[...c[i].archivos,...e.archivos]}; return c; }
        return [e, ...h];
      });

      // Generar ZIP
      this.estado.update(s => ({...s,pct:65,fase:'Creando carpeta ZIP…'}));
      await this._jszip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const carp  = san(nom);
      const fL    = e.fecha.replace(/\//g,'-');
      const ruta  = `${carp}/${fL}_PLAN-DE-TRABAJO-INDIVIDUALIZADO/`;
      zip.file(`${ruta}${san(pNom)}`, u8(dUrl));
      for (const a of this.adjuntos()) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));

      this.estado.update(s => ({...s,pct:88,fase:'Descargando ZIP…'}));
      const blob: Blob = await zip.generateAsync({type:'blob'});
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'),{href:url,download:`${carp}.zip`}).click();
      URL.revokeObjectURL(url);

      this.estado.update(s => ({...s,pct:100,fase:'¡Expediente guardado!',exito:true}));
      this._finEstado(() => {
        this.guardando.set(false);
        this.verPrevia.set(false);
        this.toast$(`Plan de ${nom} guardado`);
      });
    } catch(e: any) {
      this.estado.update(s => ({...s,pct:100,fase:'Error',error:e?.message||''}));
      this._finEstado(() => { this.guardando.set(false); this.toast$('Error al guardar','err'); });
    }
  }

  /** Limpia el overlay de progreso y ejecuta callback */
  private _finEstado(fn: () => void): void {
    setTimeout(() => {
      this.estado.set({activo:false,pct:0,fase:'',exito:false,error:''});
      fn(); this.cdr.markForCheck();
    }, 2200);
  }

  // ── Historial ─────────────────────────────────────────────────
  borrar(id: number): void { this.historial.update(h => h.filter(e => e.id !== id)); this.toast$('Eliminado'); }
  dlExp(e: Expediente): void { this._dl(e.pdf.dataUrl, e.pdf.nombre); }
  dlAdj(a: Adjunto): void { this._dl(a.dataUrl, a.nombre); }

  async dlZip(e: Expediente): Promise<void> {
    this.estado.set({activo:true,pct:10,fase:'Creando carpeta…',exito:false,error:''});
    try {
      await this._jszip();
      const JSZip=(window as any).JSZip, zip=new JSZip();
      const c=san(e.nombre), f=e.fecha.replace(/\//g,'-');
      const ruta=`${c}/${f}_PLAN-DE-TRABAJO-INDIVIDUALIZADO/`;
      zip.file(`${ruta}${san(e.pdf.nombre)}`, u8(e.pdf.dataUrl));
      for (const a of e.archivos) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));
      const blob: Blob = await zip.generateAsync({type:'blob'});
      const url=URL.createObjectURL(blob);
      Object.assign(document.createElement('a'),{href:url,download:`${c}.zip`}).click();
      URL.revokeObjectURL(url);
      this.estado.update(s=>({...s,pct:100,fase:'¡Descargado!',exito:true}));
      this._finEstado(() => this.toast$(`Carpeta ${c} descargada`));
    } catch(err: any) {
      this.estado.update(s=>({...s,pct:100,fase:'Error',error:err?.message||''}));
      this._finEstado(() => this.toast$('Error al crear carpeta','err'));
    }
  }

  private _dl(url: string, name: string): void {
    Object.assign(document.createElement('a'),{href:url,download:name}).click();
  }

  // ── Helpers para el template ─────────────────────────────────
  /** Lee un valor del FormGroup. */
  gv(k: string): any { return this.fg?.get(k)?.value; }

  /** Filtra valores falsos y los une con un separador */
  filterJoin(arr: any[], sep: string = ' / '): string {
    return arr.filter(v => v).join(sep);
  }

  icoAdj(tipo: string): string {
    return tipo?.includes('pdf') ? '📄' : tipo?.includes('image') ? '🖼️' : '📝';
  }
  trunc(n: string, m = 22): string { return n.length > m ? n.slice(0,m-3)+'…' : n; }

  // ── Navegación ────────────────────────────────────────────────
  /** Regresa a la pantalla anterior (Trabajo Social) */
  regresarPantallaAnterior(): void {
    this.router.navigate(['/trabajo-social']);
  }

  /** Navega a Carátula del Expediente si hay historial */
  irACaraturaExpediente(): void {
    this.router.navigate(['/caratura-expediente']);
  }
}

// ════════════════════════════════════════════════════════════════
//  HELPERS DE MÓDULO (no expuestos al template)
// ════════════════════════════════════════════════════════════════

/** Capitaliza primera letra */
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Sanitiza strings para nombres de archivo */
function san(s: string): string { return s.replace(/[/\\:*?"<>|]/g,'-').replace(/\s+/g,'_').trim(); }

/** Convierte dataUrl a Uint8Array para JSZip */
function u8(dataUrl: string): Uint8Array {
  const b = atob(dataUrl.split(',')[1]);
  const a = new Uint8Array(b.length);
  for (let i=0;i<b.length;i++) a[i]=b.charCodeAt(i);
  return a;
}