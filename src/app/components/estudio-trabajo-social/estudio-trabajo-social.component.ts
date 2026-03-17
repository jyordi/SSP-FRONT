/**
 * @file estudio-trabajo-social.component.ts
 * @description Componente Angular 18+ standalone para el Estudio de Trabajo
 *              Social del programa "Reconecta con la Paz" — DGPD y PC.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  ARQUITECTURA                                                    │
 * │                                                                  │
 * │  EstudioTrabajoSocialComponent (Standalone, OnPush)             │
 * │  ├── Signals → tabActivo, pasoActual, mostrarVistaPrevia…       │
 * │  ├── Computed → porcentaje, formularioCompleto                  │
 * │  ├── FormGroup (ReactiveFormsModule) — 60+ controles            │
 * │  ├── PDF pipeline — jsPDF nativo (sin html2canvas)              │
 * │  │     _cargarJsPDF() → _generarPDF() → descargar/guardar       │
 * │  ├── Wizard paso a paso (10 secciones)                          │
 * │  ├── Historial en memoria Signal<EntradaHistorial[]>            │
 * │  └── Descarga en carpeta ZIP organizada (JSZip CDN)             │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Secciones del formulario (pasos del wizard):
 *   0.  Datos Personales (campos 1–12)
 *   1.  Situación Jurídica (campo 13)
 *   2.  Núcleo Familiar Primario (campo 14–15)
 *   3.  Núcleo Familiar Secundario (campo 16)
 *   4.  Datos del Indiciado / Trabajo (campo 17)
 *   5.  Grupos de Autoayuda y Adicciones (campo 9 del doc)
 *   6.  Opinión y Diagnóstico (campo 10 del doc)
 *   7.  Firmas
 *
 * PDF generado: fiel al documento oficial Word, 4 páginas carta aprox.
 *
 * @requires Angular 18+, jsPDF 2.5.1 (CDN), JSZip 3.10.1 (CDN)
 * @version 1.0.0
 */

import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ═══════════════════════════════════════════════════════════════
//  INTERFACES
// ═══════════════════════════════════════════════════════════════

/** Miembro de un núcleo familiar (fila de la tabla). */
export interface MiembroFamiliar {
  nombre:      string;
  parentesco:  string;
  edad:        string;
  edoCivil:    string;
  escolaridad: string;
  ocupacion:   string;
}

/** Archivo adjunto cargado por el usuario. */
export interface ArchivoAdjunto {
  id: number; nombre: string; tamano: number; tipo: string; dataUrl: string;
}

/** Registro guardado en el historial de sesión. */
export interface EntradaHistorial {
  id:         number;
  expediente: string;
  nombre:     string;
  delito:     string;
  fecha:      string;
  pdf:        { nombre: string; dataUrl: string };
  archivos:   ArchivoAdjunto[];
}

/** Estado del overlay de progreso animado. */
export interface EstadoPdf {
  activo: boolean; pct: number; fase: string; exito: boolean; error: string;
}

/** Metadatos de un paso del wizard. */
export interface PasoWizard {
  titulo: string; descripcion: string; icono: string; campos: string[];
}

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════

/** Definición de cada paso del wizard con sus campos requeridos. */
export const PASOS_TS: PasoWizard[] = [
  {
    titulo: '1. Datos Personales',
    descripcion: 'Información personal del imputado',
    icono: '👤',
    campos: ['nombre', 'edad', 'fechaNacimiento', 'originario'],
  },
  {
    titulo: '2. Situación Jurídica',
    descripcion: 'Información legal del proceso',
    icono: '⚖️',
    campos: ['delito', 'expedientePenal'],
  },
  {
    titulo: '3. Núcleo Familiar Primario',
    descripcion: 'Composición y características de la familia de origen',
    icono: '👨‍👩‍👧',
    campos: [],
  },
  {
    titulo: '4. Núcleo Familiar Secundario',
    descripcion: 'Composición de la familia actual (si aplica)',
    icono: '🏠',
    campos: [],
  },
  {
    titulo: '5. Datos del Indiciado',
    descripcion: 'Historial laboral y situación económica',
    icono: '💼',
    campos: [],
  },
  {
    titulo: '6. Grupos de Autoayuda',
    descripcion: 'Adicciones, terapias y participación en grupos',
    icono: '🤝',
    campos: [],
  },
  {
    titulo: '7. Opinión y Diagnóstico',
    descripcion: 'Opinión sobre el programa y diagnóstico social',
    icono: '📋',
    campos: [],
  },
  {
    titulo: '8. Firmas',
    descripcion: 'Datos del responsable y autorización',
    icono: '✍️',
    campos: [],
  },
];

/** Campos obligatorios (aplanados de todos los pasos). */
export const CAMPOS_REQUERIDOS_TS = PASOS_TS.flatMap(p => p.campos);

// ═══════════════════════════════════════════════════════════════
//  COMPONENTE
// ═══════════════════════════════════════════════════════════════

@Component({
  selector: 'app-estudio-trabajo-social',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './estudio-trabajo-social.component.html',
  styleUrls:   ['./estudio-trabajo-social.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstudioTrabajoSocialComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);

  // ── Signals de UI ────────────────────────────────────────────
  readonly tabActivo          = signal<'formulario' | 'historial'>('formulario');
  readonly pasoActual         = signal(0);
  readonly mostrarVistaPrevia = signal(false);
  readonly archivosAdjuntos   = signal<ArchivoAdjunto[]>([]);
  readonly historial          = signal<EntradaHistorial[]>([]);
  readonly toast              = signal<{ mensaje: string; tipo: string }>({ mensaje:'', tipo:'' });
  readonly estadoPdf          = signal<EstadoPdf>({ activo:false, pct:0, fase:'', exito:false, error:'' });
  readonly arrastrandoArchivo = signal(false);
  readonly generandoPdf       = signal(false);
  readonly guardando          = signal(false);
  readonly porcentaje         = signal(0);

  // ── Computed ─────────────────────────────────────────────────
  readonly formularioCompleto = computed(() =>
    CAMPOS_REQUERIDOS_TS.every(k => { const v = this._form?.value?.[k]; return v && v !== ''; })
  );
  readonly contadorHistorial = computed(() => this.historial().length);
  readonly camposPendientes  = computed(() =>
    CAMPOS_REQUERIDOS_TS.filter(k => { const v = this._form?.value?.[k]; return !v || v === ''; })
  );
  readonly totalPasos = computed(() => PASOS_TS.length);

  // ── FormGroup principal ───────────────────────────────────────
  private _form!: FormGroup;
  get formGroup(): FormGroup { return this._form; }

  // ── Datos de presentación ─────────────────────────────────────
  readonly pasos          = PASOS_TS;
  readonly opcionesSiNo   = ['SI', 'NO'];
  readonly opcionesZona   = ['URBANA', 'SUB-URBANA', 'RURAL', 'CRIMINOGENA'];
  readonly opcionesGrupo  = ['FUNCIONAL', 'DISFUNCIONAL'];
  readonly opcionesRelac  = ['ADECUADAS', 'INADECUADAS'];
  readonly opcionesNivel  = ['ALTO', 'MEDIO', 'BAJO'];
  readonly estadosCiviles = ['Soltero/a', 'Casado/a', 'Union libre', 'Divorciado/a', 'Viudo/a', 'Separado/a'];

  /** Número de filas en la tabla de núcleo familiar primario. */
  readonly FILAS_FAMILIA = 4;

  private readonly destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ══════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this._buildForm();
    // Recalcular porcentaje cada vez que cambia el formulario
    const calc = () => {
      const v = this._form?.value ?? {};
      const n = CAMPOS_REQUERIDOS_TS.filter(k => v[k] && v[k] !== '').length;
      this.porcentaje.set(
        CAMPOS_REQUERIDOS_TS.length
          ? Math.round((n / CAMPOS_REQUERIDOS_TS.length) * 100)
          : 100 // Si no hay campos requeridos, marcar como 100%
      );
    };
    calc();
    this._form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(calc);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ══════════════════════════════════════════════════════════════
  //  CONSTRUCCIÓN DEL FORMULARIO
  //
  //  Todos los campos arrancan vacíos/false.
  //  Los controles de las tablas familiares se modelan como FormArray
  //  de FormGroups (un FormGroup por fila de la tabla).
  // ══════════════════════════════════════════════════════════════

  private _buildForm(): void {
    this._form = this.fb.group({

      // ── 1. Datos Personales ─────────────────────────────────
      nombre:        ['', Validators.required],   // Campo 1
      edad:          ['', Validators.required],   // Campo 2
      sobreNombre:   [''],                        // Campo 3
      fechaNacimiento:['', Validators.required],  // Campo 4
      originario:    ['', Validators.required],   // Campo 5
      telefono:      [''],                        // Campo 6
      escolaridad:   [''],                        // Campo 7
      estadoCivil:   [''],                        // Campo 8
      nacionalidad:  [''],                        // Campo 9 (dialecto/idioma)
      religion:      [''],                        // Campo 10
      ocupacion:     [''],                        // Campo 11
      domicilioActual: [''],                      // Campo 12

      // ── 2. Situación Jurídica (Campo 13) ────────────────────
      fechaDetencion:  [''],
      delito:          ['', Validators.required],
      juzgado:         [''],
      expedientePenal: ['', Validators.required],

      // ── 3. Núcleo Familiar Primario (Campo 14–15) ───────────
      // FormArray: 4 filas de la tabla de familia primaria
      familiarPrimario: this.fb.array(
        Array.from({ length: this.FILAS_FAMILIA }, () => this._crearFilaFamiliar())
      ),
      // Características económicas de la familia primaria
      zonaFamiliaPrimaria:       ['SUB-URBANA'], // default del documento
      responsableManutension:    [''],
      ingresosMensuales:         [''],
      egresosMensuales:          [''],
      beneficiarioCoopera:       [''],
      // Características del núcleo familiar primario
      grupoFamiliarPrimario:     [''],  // FUNCIONAL / DISFUNCIONAL
      relacionesInterfamiliares: [''],  // ADECUADAS / INADECUADAS
      huboViolenciaIntrafamiliar:[''],
      violenciaEspecifique:      [''],
      nivelSocioeconomico:       [''],  // ALTO / MEDIO / BAJO
      antecedentesIntegrante:    [''],
      conceptoFamiliaDelIndiciado: [''],

      // ── 4. Núcleo Familiar Secundario (Campo 16) ────────────
      familiarSecundario: this.fb.array(
        Array.from({ length: this.FILAS_FAMILIA + 1 }, () => this._crearFilaFamiliar())
      ),
      hijosUnionesAnteriores:  [''],
      caracteristicasVivienda: [''],
      transporteCercaVivienda: [''],
      mobiliarioEnseres:       [''],
      zonaFamiliaSecundaria:   ['SUB-URBANA'],
      relacionMedioExterno:    [''],
      problemasCondutaFamiliar:[''],
      numeroParejas:           [''],

      // ── 5. Datos del Indiciado / Trabajo (Campo 17) ─────────
      trabajoAnterior:        [''],
      tiempoLaborar:          [''],
      sueldoPercibido:        [''],
      otrasAportaciones:      [''],
      distribucionGasto:      [''],
      alimentacion:           [''],
      serviciosPublicos:      [''],
      // Oferta de trabajo
      cuentaOfertaTrabajo:    [''],
      enQueConsisteOferta:    [''],
      apoyoFamiliaPersona:    [''],

      // ── 6. Grupos de Autoayuda (Campo 9 del doc) ────────────
      gruposAutoayuda:         [''],
      consomeBebidas:          [''],
      bebidaEspecifique:       [''],
      recibitTerapias:         [''],
      terapiasDonde:           [''],
      terapiasPeriodo:         [''],
      acudeAA:                 [''],
      aaDonde:                 [''],
      aaPeriodo:               [''],
      estuvoCentroRehabilitacion: [''],
      centroRehabDonde:        [''],
      centroRehabPeriodo:      [''],
      perteneceGrupoCultural:  [''],
      grupoCulturalEspecifique:[''],

      // ── 7. Opinión y Diagnóstico (Campo 10) ─────────────────
      opinionPrograma:         [''],
      observaciones:           [''],
      diagnosticoSocial:       ['FAVORABLE'],

      // ── 8. Firmas ────────────────────────────────────────────
      ciudadFecha:             ['OAXACA DE JUAREZ'],
      diaFecha:                [''],
      mesFecha:                ['ENERO'],
      anioFecha:               ['2026'],
      nombreResponsable:       ['C. ESVEL LAGUNAS RODRIGUEZ'],
      nombreDirectora:         ['MTRA. LII YIO PEREZ ZARATE'],
    });
  }

  /**
   * Crea un FormGroup que representa una fila de la tabla familiar.
   * Se reutiliza para familia primaria y secundaria.
   */
  private _crearFilaFamiliar(): FormGroup {
    return this.fb.group({
      nombre:      [''],
      parentesco:  [''],
      edad:        [''],
      edoCivil:    [''],
      escolaridad: [''],
      ocupacion:   [''],
    });
  }

  // ── Getters para los FormArray ──────────────────────────────

  /** FormArray de la tabla de familia primaria. */
  get familiarPrimario(): FormArray {
    return this._form.get('familiarPrimario') as FormArray;
  }

  /** FormArray de la tabla de familia secundaria. */
  get familiarSecundario(): FormArray {
    return this._form.get('familiarSecundario') as FormArray;
  }

  // ══════════════════════════════════════════════════════════════
  //  WIZARD — Navegación paso a paso
  // ══════════════════════════════════════════════════════════════

  siguientePaso(): void {
    if (this.pasoActual() < PASOS_TS.length - 1) {
      this.pasoActual.update(p => p + 1);
      this._scrollTop();
    }
  }

  anteriorPaso(): void {
    if (this.pasoActual() > 0) {
      this.pasoActual.update(p => p - 1);
      this._scrollTop();
    }
  }

  irAlPaso(i: number): void { this.pasoActual.set(i); this._scrollTop(); }

  private _scrollTop(): void { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  completitudPaso(i: number): number {
    const campos = PASOS_TS[i]?.campos ?? [];
    if (!campos.length) return 100;
    const v = this._form?.value ?? {};
    return Math.round((campos.filter(k => v[k] && v[k] !== '').length / campos.length) * 100);
  }

  pasoCompleto(i: number): boolean { return this.completitudPaso(i) === 100; }
  porcentajeCompletitud(): number  { return this.porcentaje(); }

  // ══════════════════════════════════════════════════════════════
  //  ARCHIVOS ADJUNTOS
  // ══════════════════════════════════════════════════════════════

  procesarArchivos(lista: FileList | null): void {
    if (!lista) return;
    Array.from(lista).forEach(f => {
      const r = new FileReader();
      r.onload = e => this.archivosAdjuntos.update(prev => [
        ...prev,
        { id: Date.now() + Math.random(), nombre: f.name, tamano: f.size, tipo: f.type, dataUrl: e.target!.result as string },
      ]);
      r.readAsDataURL(f);
    });
  }

  eliminarArchivo(id: number): void {
    this.archivosAdjuntos.update(p => p.filter(a => a.id !== id));
  }

  // ══════════════════════════════════════════════════════════════
  //  TOAST
  // ══════════════════════════════════════════════════════════════

  mostrarToast(msg: string, tipo: 'success' | 'error' = 'success'): void {
    this.toast.set({ mensaje: msg, tipo });
    setTimeout(() => this.toast.set({ mensaje:'', tipo:'' }), 3500);
  }

  // ══════════════════════════════════════════════════════════════
  //  GENERACIÓN DE PDF — jsPDF nativo
  //
  //  El documento replica fielmente el Estudio de Trabajo Social:
  //  – Encabezado institucional con logo (texto)
  //  – Campos numerados 1–17
  //  – Tablas de familia primaria y secundaria
  //  – Sección de diagnóstico y firmas
  //  – Paginación automática con saltos de página
  // ══════════════════════════════════════════════════════════════

  /** Carga jsPDF desde CDN una sola vez. */
  private _cargarJsPDF(): Promise<void> {
    return new Promise((ok, err) => {
      if ((window as any).jspdf) return ok();
      const s = Object.assign(document.createElement('script'), {
        id:  'jspdf-cdn',
        src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      });
      s.onload  = () => ok();
      s.onerror = () => err(new Error('No se pudo cargar jsPDF'));
      document.head.appendChild(s);
    });
  }

  /**
   * Genera el PDF completo del Estudio de Trabajo Social.
   *
   * Dimensiones: Letter (215.9 × 279.4 mm).
   * Márgenes: 18 mm izq/der, 15 mm sup, 15 mm inf.
   *
   * Convenciones de dibujo:
   *  Genera el PDF usando un cursor Y compartido como objeto {v:number}
   *  para que todos los helpers lo modifiquen correctamente sin closures rotos.
   *
   *  Estructura del PDF (fiel al documento Word original):
   *   Pág 1: Encabezado + Datos Personales + Situación Jurídica + Núcleo Familiar Primario
   *   Pág 2: Núcleo Familiar Secundario + Datos del Indiciado
   *   Pág 3: Grupos de Autoayuda + Opinión/Diagnóstico + Aviso + Firmas
   */
  /**
   * Genera el PDF del Estudio de Trabajo Social directamente con jsPDF.
   *
   * CORRECCIONES v2:
   *  – Una sola variable `y` se usa en todo el método (sin y -= 7 que rompe coords)
   *  – `fila2col()` dibuja 2 campos en la misma línea sin retroceder el cursor
   *  – `tablaFamiliar()` integrada en el flujo principal con `y` compartido
   *  – Cada texto usa `splitTextToSize` con el ancho real disponible
   *  – Las líneas de texto nunca superan el ancho de página
   *  – El texto largo (etiquetas + valor) se ajusta automáticamente al ancho
   *
   * Formato: Letter 215.9 × 279.4 mm. Márgenes: 15mm todo.
   */
  private async _generarPDF(): Promise<any> {
    await this._cargarJsPDF();
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const val = this._form.value;

    // ════════════════════════════════════════════════════════════
    //  CONSTANTES DE LAYOUT — Letter 215.9 × 279.4 mm
    // ════════════════════════════════════════════════════════════
    const PW   = doc.internal.pageSize.getWidth();
    const PH   = doc.internal.pageSize.getHeight();
    const ML   = 15;
    const MT   = 14;
    const MB   = 13;
    const W    = PW - ML * 2;
    const YMAX = PH - MB;

    type RGB = [number,number,number];
    const VINO:  RGB = [133,10,49];
    const GRAY:  RGB = [205,205,205];
    const DGRAY: RGB = [90,90,90];
    const BLACK: RGB = [0,0,0];
    const WHITE: RGB = [255,255,255];

    // ── Cursor Y como objeto para que los helpers lo modifiquen ──
    const cur = { y: MT };

    // ── Nueva página con mini-encabezado ──────────────────────
    const nuevaPagina = () => {
      doc.addPage();
      cur.y = 12;
      doc.setFillColor(220,220,220);
      doc.rect(ML, cur.y, W, 5, 'F');
      doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...VINO);
      doc.text('ESTUDIO DE TRABAJO SOCIAL — RECONECTA CON LA PAZ — DGPD y PC', PW/2, cur.y+3.5, {align:'center'});
      doc.setTextColor(...BLACK);
      cur.y += 8;
    };

    // ── Verificar espacio; paginar si es necesario ────────────
    const pag = (need: number) => { if (cur.y + need > YMAX) nuevaPagina(); };

    // ── Barra de sección ──────────────────────────────────────
    const SEC = (titulo: string, h = 6) => {
      pag(h + 4);
      doc.setFillColor(...GRAY);
      doc.rect(ML, cur.y, W, h, 'F');
      doc.setDrawColor(140,140,140);
      doc.rect(ML, cur.y, W, h, 'S');
      doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
      doc.text(titulo, PW/2, cur.y + h/2 + 1.5, {align:'center'});
      cur.y += h + 2;
    };

    // ── Campo inline: lbl+línea+valor; avanza cur.y ──────────
    const CAMPO = (lbl: string, valor: string, x: number, maxW: number) => {
      doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
      doc.text(lbl, x, cur.y);
      const lw = doc.getTextWidth(lbl);
      doc.setDrawColor(160,160,160); doc.setLineWidth(0.2);
      doc.line(x + lw + 1, cur.y, x + maxW, cur.y);
      if (valor && valor.trim()) {
        doc.setFont('helvetica','normal');
        const t = doc.splitTextToSize(valor, maxW - lw - 3)[0] || '';
        doc.text(t, x + lw + 2, cur.y);
      }
    };

    // ── Fila 1 campo ancho completo ───────────────────────────
    const FILA1 = (lbl: string, val: string) => {
      pag(7); CAMPO(lbl, val, ML, W); cur.y += 7;
    };

    // ── Fila 2 campos con porcentaje ──────────────────────────
    const FILA2 = (l1: string, v1: string, pct: number, l2: string, v2: string) => {
      pag(7);
      CAMPO(l1, v1, ML, W * pct - 2);
      CAMPO(l2, v2, ML + W * pct, W * (1 - pct));
      cur.y += 7;
    };

    // ── Área de texto ─────────────────────────────────────────
    const AREA = (lbl: string, valor: string, minH = 10) => {
      pag(minH + 10);
      if (lbl) {
        doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
        doc.text(lbl, ML, cur.y);
        cur.y += 4;
      }
      const lines = valor ? doc.splitTextToSize(valor, W - 4) : [];
      const h = Math.max(minH, lines.length * 4 + 4);
      pag(h);
      doc.setDrawColor(160,160,160);
      doc.rect(ML, cur.y, W, h, 'S');
      if (valor) {
        doc.setFont('helvetica','normal').setFontSize(8).setTextColor(...BLACK);
        doc.text(lines, ML + 2, cur.y + 4);
      }
      cur.y += h + 3;
    };

    // ── Tabla de núcleo familiar ──────────────────────────────
    const TABLA = (filas: any[]) => {
      const cW  = [W*0.30, W*0.15, W*0.08, W*0.13, W*0.18, W*0.16];
      const cL  = ['NOMBRE','PARENTESCO','EDAD','EDO.CIVIL','ESCOLARIDAD','OCUPACION'];
      const rH  = 7;
      pag((filas.length + 1) * rH + 2);
      // Cabecera
      let xc = ML;
      cL.forEach((h, i) => {
        doc.setFillColor(...GRAY);
        doc.rect(xc, cur.y, cW[i], rH, 'F');
        doc.setDrawColor(140,140,140);
        doc.rect(xc, cur.y, cW[i], rH, 'S');
        doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...BLACK);
        doc.text(h, xc + cW[i]/2, cur.y + rH/2 + 1.2, {align:'center'});
        xc += cW[i];
      });
      cur.y += rH;
      // Filas de datos
      filas.forEach(f => {
        xc = ML;
        [f?.nombre||'', f?.parentesco||'', f?.edad||'', f?.edoCivil||'', f?.escolaridad||'', f?.ocupacion||''].forEach((txt, i) => {
          doc.setFillColor(...WHITE);
          doc.rect(xc, cur.y, cW[i], rH, 'S');
          if (txt) {
            doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(...BLACK);
            const t = doc.splitTextToSize(txt, cW[i]-2)[0] || '';
            doc.text(t, xc+1.5, cur.y + rH/2 + 1.3);
          }
          xc += cW[i];
        });
        cur.y += rH;
      });
      cur.y += 2;
    };

    // ── Radio horizontal ──────────────────────────────────────
    const radioStr = (actual: string, opts: string[]) =>
      opts.map(o => `${o === actual ? '(X)' : '( )'} ${o}`).join('   ');

    // ── SI / NO ───────────────────────────────────────────────
    const siNo = (v: string) =>
      v === 'SI' ? 'SI (X)  NO ( )' : v === 'NO' ? 'SI ( )  NO (X)' : 'SI ( )  NO ( )';

    // ════════════════════════════════════════════════════════════
    //  ENCABEZADO INSTITUCIONAL
    // ════════════════════════════════════════════════════════════
    doc.setFontSize(11).setFont('helvetica','bold').setTextColor(...VINO);
    doc.text('SEGURIDAD CIUDADANA', ML, cur.y+6);
    doc.setFontSize(6).setFont('helvetica','normal').setTextColor(...DGRAY);
    doc.text('SECRETARIA DE SEGURIDAD', ML, cur.y+9.5);
    doc.text('Y PROTECCION', ML, cur.y+12.5);

    const xC = ML + 40 + (W-40)/2;
    const wC = W - 42;
    doc.setFontSize(7.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL', xC, cur.y+3.5, {align:'center', maxWidth:wC});
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO Y PARTICIPACION CIUDADANA', xC, cur.y+7, {align:'center', maxWidth:wC});
    doc.setFontSize(10).setFont('helvetica','bold');
    doc.text('ESTUDIO DE TRABAJO SOCIAL', xC, cur.y+12, {align:'center', maxWidth:wC});
    doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...DGRAY);
    doc.text('Programa: RECONECTA CON LA PAZ', xC, cur.y+15.5, {align:'center', maxWidth:wC});

    cur.y += 21;
    doc.setDrawColor(...VINO); doc.setLineWidth(0.6);
    doc.line(ML, cur.y, ML+W, cur.y);
    doc.setLineWidth(0.2);
    cur.y += 5;

    // ════════════════════════════════════════════════════════════
    //  DATOS PERSONALES (1–12)
    // ════════════════════════════════════════════════════════════
    SEC('DATOS PERSONALES DEL IMPUTADO');
    FILA2('1.- NOMBRE DEL IMPUTADO: ', val.nombre||'', 0.65, '2.- EDAD: ', val.edad||'');
    FILA2('3.- SOBRENOMBRE: ', val.sobreNombre||'', 0.5, '4.- FECHA DE NACIMIENTO: ', val.fechaNacimiento||'');
    FILA2('5.- ORIGINARIO: ', val.originario||'', 0.6, '6.- TELEFONO: ', val.telefono||'');
    FILA2('7.- ESCOLARIDAD ACTUAL: ', val.escolaridad||'', 0.55, '8.- ESTADO CIVIL: ', val.estadoCivil||'');
    FILA2('9.- NACIONALIDAD / DIALECTO O IDIOMA: ', val.nacionalidad||'', 0.55, '10.- RELIGION: ', val.religion||'');
    FILA2('11.- OCUPACION: ', val.ocupacion||'', 0.5, '12.- DOMICILIO ACTUAL: ', val.domicilioActual||'');

    // ════════════════════════════════════════════════════════════
    //  SITUACION JURIDICA (13)
    // ════════════════════════════════════════════════════════════
    SEC('13.- SITUACION JURIDICA:');
    FILA2('FECHA DE DETENCION: ', val.fechaDetencion||'', 0.5, 'EXPEDIENTE PENAL o PROCESO: ', val.expedientePenal||'');
    FILA1('DELITO(S): ', val.delito||'');
    FILA1('JUZGADO: ', val.juzgado||'');

    // ════════════════════════════════════════════════════════════
    //  14. NUCLEO FAMILIAR PRIMARIO
    // ════════════════════════════════════════════════════════════
    SEC('14.- DATOS GENERALES DEL NUCLEO FAMILIAR PRIMARIO');
    TABLA(val.familiarPrimario || []);

    // ════════════════════════════════════════════════════════════
    //  15. SITUACION ECONOMICA FAMILIAR PRIMARIA
    // ════════════════════════════════════════════════════════════
    SEC('15.- SENALAR COMO ERA LA SITUACION ECONOMICA EN SU FAMILIA PRIMARIA:');

    pag(12);
    doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('* SENALAR CARACTERISTICAS DE LA ZONA: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(radioStr(val.zonaFamiliaPrimaria, ['URBANA','SUB-URBANA','RURAL','CRIMINOGENA']),
      ML + doc.getTextWidth('* SENALAR CARACTERISTICAS DE LA ZONA: '), cur.y);
    cur.y += 5;
    doc.setFontSize(7).setTextColor(...DGRAY);
    doc.text('(Existencia de bandas o pandillas, sobrepoblacion, prostibulos, cantinas, billares, etc.)', ML+3, cur.y);
    cur.y += 5; doc.setTextColor(...BLACK);

    FILA1('* RESPONSABLE(S) DE LA MANUTENCION DEL HOGAR: ', val.responsableManutension||'');
    FILA2('* INGRESOS ECONOMICOS MENSUALES: ', val.ingresosMensuales||'', 0.5,
          '* EGRESOS ECONOMICOS MENSUALES: ', val.egresosMensuales||'');
    FILA1('* ACTUALMENTE COOPERA EL BENEFICIARIO CON LA FAMILIA: ', val.beneficiarioCoopera||'');

    pag(6);
    doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('CARACTERISTICAS DEL NUCLEO FAMILIAR PRIMARIO:', ML, cur.y);
    cur.y += 6;

    pag(7);
    doc.setFont('helvetica','bold'); doc.text('GRUPO FAMILIAR: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(radioStr(val.grupoFamiliarPrimario, ['FUNCIONAL','DISFUNCIONAL']),
      ML + doc.getTextWidth('GRUPO FAMILIAR: '), cur.y);
    cur.y += 7;

    pag(7);
    doc.setFont('helvetica','bold'); doc.text('RELACIONES INTERFAMILIARES: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(radioStr(val.relacionesInterfamiliares, ['ADECUADAS','INADECUADAS']),
      ML + doc.getTextWidth('RELACIONES INTERFAMILIARES: '), cur.y);
    cur.y += 7;

    pag(7);
    doc.setFont('helvetica','bold'); doc.text('HUBO VIOLENCIA INTRAFAMILIAR: EN CASO AFIRMATIVO ESPECIFICAR:', ML, cur.y);
    cur.y += 5;
    doc.setFont('helvetica','normal');
    doc.text(val.violenciaEspecifique || '_______________________________', ML+4, cur.y);
    cur.y += 7;

    pag(7);
    doc.setFont('helvetica','bold'); doc.text('NIVEL SOCIO-ECONOMICO Y CULTURAL: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(radioStr(val.nivelSocioeconomico, ['ALTO','MEDIO','BAJO']),
      ML + doc.getTextWidth('NIVEL SOCIO-ECONOMICO Y CULTURAL: '), cur.y);
    cur.y += 7;

    AREA('ALGUN INTEGRANTE DE LA FAMILIA TIENE ANTECEDENTES PENALES O DE ADICCION A ALGUN ESTUPEFACIENTE O CUALQUIER TIPO DE TOXICOS: ESPECIFIQUE:', val.antecedentesIntegrante||'');
    AREA('CONCEPTO QUE TIENE LA FAMILIA DEL INDICIADO:', val.conceptoFamiliaDelIndiciado||'');

    // ════════════════════════════════════════════════════════════
    //  16. NUCLEO FAMILIAR SECUNDARIO
    // ════════════════════════════════════════════════════════════
    SEC('16.- DATOS GENERALES DEL NUCLEO FAMILIAR SECUNDARIO');
    pag(5);
    doc.setFontSize(7.5).setFont('helvetica','italic').setTextColor(...DGRAY);
    doc.text('(Conteste los siguientes puntos si el indiciado es casado o vive en union libre)', ML, cur.y);
    cur.y += 6; doc.setTextColor(...BLACK);
    TABLA(val.familiarSecundario || []);
    FILA1('HIJOS DE UNIONES ANTERIORES: ', val.hijosUnionesAnteriores||'');
    AREA('CARACTERISTICAS DE VIVIENDA:', val.caracteristicasVivienda||'');
    FILA1('EL TRANSPORTE ESTA CERCA DE SU VIVIENDA O TIENE QUE CAMINAR PARA TOMARLO: ', val.transporteCercaVivienda||'');
    AREA('MOBILIARIO Y ENSERES DOMESTICOS:', val.mobiliarioEnseres||'');

    pag(12);
    doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('* SENALAR CARACTERISTICAS DE LA ZONA: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(radioStr(val.zonaFamiliaSecundaria, ['URBANA','SUB-URBANA','RURAL','CRIMINOGENA']),
      ML + doc.getTextWidth('* SENALAR CARACTERISTICAS DE LA ZONA: '), cur.y);
    cur.y += 5;
    doc.setFontSize(7).setTextColor(...DGRAY);
    doc.text('(Existencia de bandas o pandillas, sobrepoblacion, prostibulos, cantinas, billares, etc.)', ML+3, cur.y);
    cur.y += 5; doc.setTextColor(...BLACK);

    AREA('RELACION CON EL MEDIO EXTERNO:', val.relacionMedioExterno||'');
    AREA('ALGUN MIEMBRO DE LA FAMILIA PRESENTA PROBLEMAS DE CONDUCTA PARA O ANTISOCIAL. ESPECIFIQUE:', val.problemasCondutaFamiliar||'');
    FILA1('NUMERO DE PAREJAS CON LAS QUE HA VIVIDO DE MANERA ESTABLE: ', val.numeroParejas||'');

    // ════════════════════════════════════════════════════════════
    //  17. DATOS DEL INDICIADO
    // ════════════════════════════════════════════════════════════
    SEC('17.- DATOS DEL INDICIADO:');
    FILA1('TRABAJO DESEMPENADO ANTERIORMENTE: ', val.trabajoAnterior||'');
    FILA2('TIEMPO DE LABORAR: ', val.tiempoLaborar||'', 0.5, 'SUELDO PERCIBIDO: ', val.sueldoPercibido||'');
    AREA('APARTE DEL INDICIADO, SENALE OTRAS APORTACIONES ECONOMICAS DE LA FAMILIA, QUIEN LAS REALIZA Y A CUANTO ASCIENDEN:', val.otrasAportaciones||'');
    AREA('DISTRIBUCION DEL GASTO FAMILIAR:', val.distribucionGasto||'');
    FILA1('LA ALIMENTACION EN QUE CONSISTE: ', val.alimentacion||'');
    FILA1('CON QUE SERVICIOS PUBLICOS CUENTA ACTUALMENTE (LUZ, AGUA, DRENAJE, ETC): ', val.serviciosPublicos||'');

    pag(7);
    doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('CUENTA CON OFERTA DE TRABAJO: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(siNo(val.cuentaOfertaTrabajo), ML+doc.getTextWidth('CUENTA CON OFERTA DE TRABAJO: '), cur.y);
    cur.y += 7;
    if (val.enQueConsisteOferta) { pag(6); doc.text('EN QUE CONSISTE: '+val.enQueConsisteOferta, ML+4, cur.y); cur.y+=6; }

    pag(7);
    doc.setFont('helvetica','bold');
    doc.text('CUENTA CON EL APOYO DE LA FAMILIA O DE ALGUNA PERSONA: ', ML, cur.y);
    doc.setFont('helvetica','normal');
    doc.text(siNo(val.apoyoFamiliaPersona), ML+doc.getTextWidth('CUENTA CON EL APOYO DE LA FAMILIA O DE ALGUNA PERSONA: '), cur.y);
    cur.y += 7;

    // ════════════════════════════════════════════════════════════
    //  9. GRUPOS DE AUTOAYUDA
    // ════════════════════════════════════════════════════════════
    SEC('9.- GRUPOS DE AUTOAYUDA:');
    AREA('GRUPOS DE AUTOAYUDA:', val.gruposAutoayuda||'');

    const itemSiNo = (lbl: string, ctrl: string, detLbl?: string, detVal?: string, perLbl?: string, perVal?: string) => {
      pag(7);
      doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
      doc.text(lbl, ML, cur.y);
      doc.setFont('helvetica','normal');
      doc.text(siNo(ctrl), ML+doc.getTextWidth(lbl), cur.y);
      cur.y += 7;
      if ((detVal&&detVal.trim()) || (perVal&&perVal.trim())) {
        pag(6);
        let t = '';
        if (detLbl&&detVal) t += detLbl+': '+detVal;
        if (perLbl&&perVal) t += '   '+perLbl+': '+perVal;
        if (t) { doc.setFontSize(8).setTextColor(...DGRAY); doc.text(t, ML+4, cur.y); cur.y+=6; doc.setTextColor(...BLACK); }
      }
    };

    itemSiNo('CONSUME BEBIDAS EMBRIAGANTES O ADICTO A ALGUN PSICOTROPICO: ', val.consomeBebidas, 'ESPECIFIQUE', val.bebidaEspecifique);
    itemSiNo('HA RECIBIDO TERAPIAS PSICOLOGICAS O DE OTRA INDOLE: ', val.recibitTerapias, 'EN DONDE', val.terapiasDonde, 'PERIODO', val.terapiasPeriodo);
    itemSiNo('ACUDE A SESIONES DE GRUPOS (AA, NEUROTICOS ANONIMOS, ETC.): ', val.acudeAA, 'EN DONDE', val.aaDonde, 'PERIODO', val.aaPeriodo);
    itemSiNo('HA ESTADO EN REHABILITACION O ANEXADO EN ALGUN GRUPO DE AUTOAYUDA SOCIAL: ', val.estuvoCentroRehabilitacion, 'EN DONDE', val.centroRehabDonde, 'PERIODO', val.centroRehabPeriodo);
    itemSiNo('PERTENECE A ALGUN GRUPO CULTURAL, RELIGIOSO, DEPORTIVO, CLUB, ETC.: ', val.perteneceGrupoCultural, 'ESPECIFIQUE EN DONDE', val.grupoCulturalEspecifique);

    // ════════════════════════════════════════════════════════════
    //  10. OPINION Y DIAGNOSTICO
    // ════════════════════════════════════════════════════════════
    SEC('10.- CUAL ES SU OPINION ACERCA DEL PROGRAMA RECONECTA CON LA PAZ:');
    AREA('', val.opinionPrograma||'', 14);
    AREA('OBSERVACIONES:', val.observaciones||'');

    pag(10);
    doc.setFontSize(9).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('DIAGNOSTICO SOCIAL: ', ML, cur.y);
    doc.setFontSize(10).setTextColor(...VINO);
    doc.text(val.diagnosticoSocial||'FAVORABLE', ML+doc.getTextWidth('DIAGNOSTICO SOCIAL: ')+2, cur.y);
    doc.setTextColor(...BLACK);
    cur.y += 10;

    // ════════════════════════════════════════════════════════════
    //  AVISO DE PRIVACIDAD
    // ════════════════════════════════════════════════════════════
    const avisoTxt = 'Los datos personales recabados seran protegidos, incorporados y tratados en el Sistema de Datos Personales de la Direccion General de Prevencion del Delito y Participacion Ciudadana (DGPDyPC) de la Secretaria de Seguridad Publica y Proteccion Ciudadana del Estado, de conformidad con lo dispuesto por el articulo 12 de la Ley de Transparencia y Acceso a la Informacion Publica del Estado de Oaxaca y 9,10,11,12,13,14,15 de la Ley de Proteccion de Datos Personales del Estado de Oaxaca. A si mismo, se le informa que sus datos no podran ser difundidos sin su consentimiento expreso, salvo las excepciones previstas en la Ley, a su vez podra ejercer los derechos de acceso, rectificacion, cancelacion y oposicion, asi como la revocacion del consentimiento en la DGPDyPC ubicada en la calle de las Aguilas num. 124. Col. Universidad, hacienda de Candiani.';
    const avisoLines = doc.splitTextToSize(avisoTxt, W-4);
    const avisoH = avisoLines.length * 3.5 + 8;
    pag(avisoH+4);
    doc.setFontSize(7).setFont('helvetica','normal').setTextColor(...DGRAY);
    doc.setDrawColor(180,180,180);
    doc.rect(ML, cur.y, W, avisoH, 'S');
    doc.text(avisoLines, ML+2, cur.y+4);
    doc.setTextColor(...BLACK);
    cur.y += avisoH + 7;

    // ════════════════════════════════════════════════════════════
    //  FIRMAS
    // ════════════════════════════════════════════════════════════
    pag(38);
    const dia  = val.diaFecha  || '00';
    const mes  = (val.mesFecha  || 'ENERO').toUpperCase();
    const anio = val.anioFecha || '2026';
    doc.setFontSize(9).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text(`${val.ciudadFecha||'OAXACA DE JUAREZ'}, ${dia} DE ${mes} DEL ${anio}.`, ML, cur.y);
    cur.y += 14;

    const cFW  = W * 0.42;
    const xFL  = ML;
    const xFR  = ML + W - cFW;

    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
    doc.line(xFL, cur.y, xFL+cFW, cur.y);
    doc.setFont('helvetica','bold').setFontSize(8.5);
    doc.text('ENC. DEL DEPTO. DE TRAB. SOC.', xFL+cFW/2, cur.y+5, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.text(val.nombreResponsable||'C. ESVEL LAGUNAS RODRIGUEZ', xFL+cFW/2, cur.y+10, {align:'center'});

    doc.line(xFR, cur.y, xFR+cFW, cur.y);
    doc.setFont('helvetica','bold');
    doc.text('Vo. Bo.', xFR+cFW/2, cur.y+5, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.text(val.nombreDirectora||'MTRA. LII YIO PEREZ ZARATE', xFR+cFW/2, cur.y+10, {align:'center'});
    doc.text('DIRECTORA DE PREVENCION DEL DELITO', xFR+cFW/2, cur.y+15, {align:'center'});
    doc.text('Y PARTICIPACION CIUDADANA', xFR+cFW/2, cur.y+20, {align:'center'});
    doc.setLineWidth(0.2);

    // ── Numeración de páginas ─────────────────────────────────
    const totalPags = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(140,140,140);
      doc.text(`${p} / ${totalPags}`, PW/2, PH-6, {align:'center'});
    }

    return doc;
  }

  // ══════════════════════════════════════════════════════════════
  //  DESCARGA DEL PDF
  // ══════════════════════════════════════════════════════════════

  async descargarPdf(): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:10, fase:'Iniciando...', exito:false, error:'' });
    this.generandoPdf.set(true);
    try {
      this.estadoPdf.update(s => ({ ...s, pct:35, fase:'Cargando jsPDF...' }));
      await this._cargarJsPDF();
      this.estadoPdf.update(s => ({ ...s, pct:65, fase:'Construyendo paginas del PDF...' }));
      const doc = await this._generarPDF();
      this.estadoPdf.update(s => ({ ...s, pct:90, fase:'Preparando descarga...' }));
      const safe = (this._form.value.nombre || 'estudio').replace(/\s+/g, '_');
      doc.save(`estudio_trabajo_social_${safe}.pdf`);
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'PDF descargado!', exito:true }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.generandoPdf.set(false);
        this.mostrarToast('PDF descargado correctamente');
      }, 2200);
    } catch (e: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error al generar', error: e?.message || '' }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.generandoPdf.set(false);
        this.mostrarToast('Error al generar el PDF', 'error');
      }, 2200);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  CARGA DE JSZip PARA CARPETA ORGANIZADA
  // ══════════════════════════════════════════════════════════════

  private _cargarJsZip(): Promise<void> {
    return new Promise((ok, err) => {
      if ((window as any).JSZip) return ok();
      const s = Object.assign(document.createElement('script'), {
        id:  'jszip-cdn',
        src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      });
      s.onload  = () => ok();
      s.onerror = () => err(new Error('No se pudo cargar JSZip'));
      document.head.appendChild(s);
    });
  }

  private _sanitizar(s: string): string {
    return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim();
  }

  private _dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const binary  = atob(base64);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // ══════════════════════════════════════════════════════════════
  //  GUARDAR EN HISTORIAL + DESCARGA EN CARPETA ZIP
  //
  //  Estructura del ZIP:
  //  {expediente}/
  //    {fecha}_ESTUDIO-DE-TRABAJO-SOCIAL/
  //      ESTUDIO-DE-TRABAJO-SOCIAL_{nombre}.pdf
  //      <archivos adjuntos>
  // ══════════════════════════════════════════════════════════════

  async guardarEnHistorial(): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:5, fase:'Preparando expediente...', exito:false, error:'' });
    this.guardando.set(true);
    try {
      this.estadoPdf.update(s => ({ ...s, pct:35, fase:'Generando PDF...' }));
      const doc      = await this._generarPDF();
      const dataUrl  = doc.output('datauristring');
      const val      = this._form.value;
      const expId    = val.expedientePenal || `EXP-TS-${Date.now()}`;
      const pdfNom   = `ESTUDIO-DE-TRABAJO-SOCIAL_${this._sanitizar(val.nombre || 'SIN-NOMBRE')}.pdf`;

      const entrada: EntradaHistorial = {
        id:         Date.now(),
        expediente: expId,
        nombre:     val.nombre,
        delito:     val.delito,
        fecha:      new Date().toLocaleDateString('es-MX'),
        pdf:        { nombre: pdfNom, dataUrl },
        archivos:   [...this.archivosAdjuntos()],
      };

      // Guardar en historial en memoria
      this.historial.update(prev => {
        const idx = prev.findIndex(e => e.expediente === expId);
        if (idx >= 0) {
          const c = [...prev];
          c[idx] = { ...c[idx], ...entrada, archivos: [...c[idx].archivos, ...entrada.archivos] };
          return c;
        }
        return [entrada, ...prev];
      });

      this.estadoPdf.update(s => ({ ...s, pct:65, fase:'Creando carpeta ZIP...' }));
      await this._cargarJsZip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();

      const carpetaRaiz = this._sanitizar(expId);
      const fechaLimpia = entrada.fecha.replace(/\//g, '-');
      const ruta = `${carpetaRaiz}/${fechaLimpia}_ESTUDIO-DE-TRABAJO-SOCIAL/`;

      zip.file(`${ruta}${this._sanitizar(pdfNom)}`, this._dataUrlToUint8Array(dataUrl));
      for (const arch of this.archivosAdjuntos()) {
        zip.file(`${ruta}${this._sanitizar(arch.nombre)}`, this._dataUrlToUint8Array(arch.dataUrl));
      }

      this.estadoPdf.update(s => ({ ...s, pct:85, fase:'Descargando ZIP...' }));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${carpetaRaiz}.zip`; a.click();
      URL.revokeObjectURL(url);

      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Expediente guardado y descargado!', exito:true }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.guardando.set(false);
        this.mostrarVistaPrevia.set(false);
        this.mostrarToast(`Expediente ${expId} guardado y descargado`);
      }, 2200);

    } catch (e: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error', error: e?.message || '' }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.guardando.set(false);
        this.mostrarToast('Error al guardar', 'error');
      }, 2200);
    }
  }

  eliminarExpediente(id: number): void {
    this.historial.update(p => p.filter(e => e.id !== id));
    this.mostrarToast('Expediente eliminado');
  }

  descargarPdfHistorial(e: EntradaHistorial): void {
    this._dl(e.pdf.dataUrl, e.pdf.nombre);
  }

  async descargarExpedienteCompleto(e: EntradaHistorial): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:10, fase:'Preparando carpeta...', exito:false, error:'' });
    try {
      await this._cargarJsZip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const carpeta  = this._sanitizar(e.expediente);
      const fechaL   = e.fecha.replace(/\//g, '-');
      const ruta     = `${carpeta}/${fechaL}_ESTUDIO-DE-TRABAJO-SOCIAL/`;
      zip.file(`${ruta}${this._sanitizar(e.pdf.nombre)}`, this._dataUrlToUint8Array(e.pdf.dataUrl));
      for (const a of e.archivos) {
        zip.file(`${ruta}${this._sanitizar(a.nombre)}`, this._dataUrlToUint8Array(a.dataUrl));
      }
      this.estadoPdf.update(s => ({ ...s, pct:80, fase:'Generando ZIP...' }));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${carpeta}.zip` }).click();
      URL.revokeObjectURL(url);
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Carpeta descargada!', exito:true }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.mostrarToast(`Carpeta ${carpeta} descargada`);
      }, 2200);
    } catch (err: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error', error: err?.message || '' }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.mostrarToast('Error al crear la carpeta', 'error');
      }, 2200);
    }
  }

  descargarArchivo(a: ArchivoAdjunto): void { this._dl(a.dataUrl, a.nombre); }
  private _dl(url: string, name: string): void {
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
  }

  cerrarSesion(): void { alert('Sesion cerrada.\n(TODO: integrar con AuthService + Router)'); }

  // ── Helpers para el template ─────────────────────────────────
  /** Obtiene el valor actual de un control del FormGroup principal. */
  v(k: string): any { return this._form?.get(k)?.value; }

  /** Obtiene el valor de un control dentro de un item del FormArray. */
  vArr(arr: string, idx: number, campo: string): string {
    const fa = this._form?.get(arr) as FormArray;
    return fa?.at(idx)?.get(campo)?.value || '';
  }

  /** Devuelve [X] si el valor es 'SI', [ ] si es 'NO' o vacío. */
  chkView(v: string): string {
    return v === 'SI' ? 'SI [X]  NO [ ]' : v === 'NO' ? 'SI [ ]  NO [X]' : 'SI [ ]  NO [ ]';
  }

  /** Devuelve (*) para la opción seleccionada. */
  radioView(actual: string, opciones: string[]): string {
    return opciones.map(op => `${op === actual ? '(X)' : '( )'} ${op}`).join('   ');
  }

  iconoArchivo(t: string): string {
    return t?.includes('pdf') ? '📄' : t?.includes('image') ? '🖼️' : '📝';
  }

  truncar(n: string, m = 22): string {
    return n.length > m ? n.slice(0, m - 3) + '...' : n;
  }
}