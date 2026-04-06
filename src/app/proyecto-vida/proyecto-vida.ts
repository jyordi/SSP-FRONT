/**
 * proyecto-vida.ts  — v1.0.0
 * ════════════════════════════════════════════════════════════════════
 * Módulo: Plan de Trabajo Individual / Proyecto de Vida
 * Programa "Reconecta con la Paz" — DGPD y PC
 *
 * DOCUMENTO (réplica exacta del PDF original):
 *  Página Letter 215.9 × 279.4 mm
 *
 *  ENCABEZADO:
 *   [Logo SEGURIDAD]  [Logo PREVENCIÓN]
 *   SUBSECRETARIA DE PREVENCIÓN Y REINSERCIÓN SOCIAL
 *   DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA
 *   VALORACIÓN CLÍNICA PSICOLÓGICA.
 *
 *  CUERPO:
 *   PLAN DE TRABAJO INDIVIDUAL  (bold centrado)
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Proceso de seguimiento de actividades del programa       │
 *   │             "RECONECTA CON LA PAZ."  (bold italic)       │
 *   ├──────────────┬────────────┬─────────────┬───────────────┤
 *   │  ACTIVIDAD   │   ESTATUS  │   OBJETIVO  │ CUMPLIMIENTO  │
 *   ├──────────────┼────────────┼─────────────┼───────────────┤
 *   │ EDUCATIVA    │            │             │               │
 *   │ PSICOSOCIAL  │            │             │               │
 *   │ RED DE APOYO │            │             │               │
 *   │ PSICOLÓGICA  │            │             │               │
 *   │ ADICCIONES   │            │             │               │
 *   │ FAMILIAR     │            │             │               │
 *   │ LABORAL      │            │             │               │
 *   │ DEPORTIVA    │            │             │               │
 *   │ CULTURAL     │            │             │               │
 *   ├──────────────┴────────────┴─────────────┴───────────────┤
 *   │ OBSERVACIONES                                            │
 *   └──────────────────────────────────────────────────────────┘
 *
 *  MARCA DE AGUA: imagen personalizable, centrada, opacity 12%
 * ════════════════════════════════════════════════════════════════════
 */

import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }          from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router }                from '@angular/router';
import { Subject }               from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// ════════════════════════════════════════════════════════════════
//  INTERFACES
// ════════════════════════════════════════════════════════════════

export interface Adjunto {
  id: number; nombre: string; tamano: number; tipo: string; dataUrl: string;
}
export interface EntradaHistorial {
  id: number; nombre: string; fecha: string;
  pdf: { nombre: string; dataUrl: string }; archivos: Adjunto[];
}
export interface EstadoPdf {
  activo: boolean; pct: number; fase: string; exito: boolean; error: string;
}

/** Las 9 actividades del plan de trabajo */
export const ACTIVIDADES = [
  'educativa',
  'psicosocial',
  'redApoyo',
  'psicologica',
  'adicciones',
  'familiar',
  'laboral',
  'deportiva',
  'cultural',
] as const;

/** Etiquetas de display para cada actividad */
export const LABELS: Record<string, string> = {
  educativa:   'EDUCATIVA',
  psicosocial: 'PSICOSOCIAL',
  redApoyo:    'RED DE APOYO',
  psicologica: 'PSICOLÓGICA',
  adicciones:  'ADICCIONES',
  familiar:    'FAMILIAR',
  laboral:     'LABORAL',
  deportiva:   'DEPORTIVA',
  cultural:    'CULTURAL',
};

// ════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-proyecto-vida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './proyecto-vida.html',
  styleUrl:    './proyecto-vida.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectoVida implements OnInit, OnDestroy {

  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  // ── Signals ──────────────────────────────────────────────────
  readonly tabActivo  = signal<'form' | 'hist'>('form');
  readonly verPrevia  = signal(false);
  readonly adjuntos   = signal<Adjunto[]>([]);
  readonly historial  = signal<EntradaHistorial[]>([]);
  readonly toast      = signal<{ msg: string; tipo: string }>({ msg: '', tipo: '' });
  readonly estado     = signal<EstadoPdf>({ activo: false, pct: 0, fase: '', exito: false, error: '' });
  readonly dragging   = signal(false);
  readonly generando  = signal(false);
  readonly guardando  = signal(false);

  /**
   * Imagen de marca de agua personalizable.
   * Se dibuja centrada con opacity 12%, detrás del contenido.
   * Vacío → sin marca de agua.
   */
  readonly marcaUrl = signal<string>('');

  readonly totalHistorial = computed(() => this.historial().length);

  // Expone constantes al template
  readonly ACTS   = ACTIVIDADES;
  readonly LABELS = LABELS;

  fg!: FormGroup;
  private readonly destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ══════════════════════════════════════════════════════════════

  ngOnInit(): void  { this._buildForm(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ══════════════════════════════════════════════════════════════
  //  FORMULARIO
  //  Controles generados dinámicamente por actividad:
  //    {act}Estatus, {act}Objetivo, {act}Cumplimiento
  //  Más el campo observaciones
  // ══════════════════════════════════════════════════════════════

  private _buildForm(): void {
    const controls: Record<string, any> = { observaciones: [''] };
    ACTIVIDADES.forEach(act => {
      controls[`${act}Estatus`]       = [''];
      controls[`${act}Objetivo`]      = [''];
      controls[`${act}Cumplimiento`]  = [''];
    });
    this.fg = this.fb.group(controls);
  }

  // ══════════════════════════════════════════════════════════════
  //  ARCHIVOS ADJUNTOS
  // ══════════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════════
  //  MARCA DE AGUA
  // ══════════════════════════════════════════════════════════════

  cargarMarca(file: File | null): void {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => { this.marcaUrl.set(e.target!.result as string); this.cdr.markForCheck(); };
    r.readAsDataURL(file);
  }
  quitarMarca(): void { this.marcaUrl.set(''); }

  // ══════════════════════════════════════════════════════════════
  //  TOAST
  // ══════════════════════════════════════════════════════════════

  toast$(msg: string, tipo: 'ok' | 'err' = 'ok'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => { this.toast.set({ msg: '', tipo: '' }); this.cdr.markForCheck(); }, 3500);
  }

  // ══════════════════════════════════════════════════════════════
  //  CDN LOADERS
  // ══════════════════════════════════════════════════════════════

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
  private _jszip(): Promise<void> {
    return this._script('jszip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }

  // ══════════════════════════════════════════════════════════════
  //  GENERACIÓN DE PDF — RÉPLICA EXACTA DEL DOCUMENTO ORIGINAL
  //
  //  Página Letter: 215.9 × 279.4 mm
  //  Márgenes: 18mm izq/der, 15mm sup/inf
  //
  //  COLUMNAS DE LA TABLA (estimadas del PDF visual):
  //   ACTIVIDAD:    ~22%
  //   ESTATUS:      ~26%
  //   OBJETIVO:     ~26%
  //   CUMPLIMIENTO: ~26%
  //
  //  ORDEN DE DIBUJO:
  //   1. Marca de agua (opacity 0.12, centrada, detrás)
  //   2. Encabezado institucional (logos + títulos)
  //   3. "PLAN DE TRABAJO INDIVIDUAL"
  //   4. Tabla completa
  // ══════════════════════════════════════════════════════════════

  private async _pdf(): Promise<any> {
    await this._jspdf();
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const v   = this.fg.value;

    const PW = doc.internal.pageSize.getWidth();   // 215.9
    const PH = doc.internal.pageSize.getHeight();  // 279.4
    const ML = 17;    // margen izquierdo
    const MT = 13;    // margen superior
    const W  = PW - ML * 2;  // ancho útil

    type C3 = [number, number, number];
    const VINO:  C3 = [133, 10, 49];
    const BLACK: C3 = [0, 0, 0];
    const GRAY1: C3 = [200, 200, 200];  // borde tabla
    const GRAY2: C3 = [230, 230, 230];  // fondo cabeceras

    let y = MT;

    // ── 1. MARCA DE AGUA (dibujada PRIMERO, detrás del contenido) ─
    if (this.marcaUrl()) {
      try {
        const mS = 140;
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
        const ext = this.marcaUrl().split(';')[0].split('/')[1]?.toUpperCase() || 'PNG';
        doc.addImage(this.marcaUrl(), ext, (PW - mS) / 2, (PH - mS) / 2, mS, mS);
        doc.restoreGraphicsState();
      } catch { /* imagen inválida */ }
    }

    // ── 2. ENCABEZADO ────────────────────────────────────────────
    // Línea decorativa
    doc.setFillColor(...VINO);
    doc.rect(ML, y, W, 1.2, 'F');
    y += 2.5;

    // Texto institucional
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('SEGURIDAD', ML, y + 3.5);
    doc.setFontSize(5.5).setFont('helvetica', 'normal').setTextColor(...BLACK);
    doc.text('SECRETARÍA DE SEGURIDAD Y', ML, y + 6.8);
    doc.text('PROTECCIÓN CIUDADANA', ML, y + 9.5);

    // Línea divisoria vertical simulada
    const midX = PW / 2;
    doc.setDrawColor(...GRAY1); doc.setLineWidth(0.3);
    doc.line(midX, y, midX, y + 13);

    // Lado derecho
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('PREVENCIÓN', midX + 4, y + 3.5);
    doc.setFontSize(5.5).setFont('helvetica', 'normal').setTextColor(...BLACK);
    doc.text('DIRECCIÓN GENERAL DE PREVENCIÓN DEL', midX + 4, y + 6.8);
    doc.text('DELITO Y PARTICIPACIÓN CIUDADANA', midX + 4, y + 9.5);
    y += 15;

    // Línea divisoria horizontal
    doc.setFillColor(...VINO);
    doc.rect(ML, y, W, 0.8, 'F');
    y += 4;

    // Títulos institucionales centrados
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCIÓN Y REINSERCIÓN SOCIAL', PW / 2, y + 4, { align: 'center' });
    y += 7;
    doc.setFontSize(8.5);
    doc.text('DIRECCIÓN GENERAL DE PREVENCIÓN DEL DELITO Y PARTICIPACIÓN CIUDADANA', PW / 2, y + 3.5, { align: 'center', maxWidth: W });
    y += 7;
    doc.text('VALORACIÓN CLÍNICA PSICOLÓGICA.', PW / 2, y + 3.5, { align: 'center' });
    y += 10;

    // ── 3. TÍTULO "PLAN DE TRABAJO INDIVIDUAL" ───────────────────
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...BLACK);
    doc.text('PLAN DE TRABAJO INDIVIDUAL', PW / 2, y, { align: 'center' });
    y += 7;

    // ── 4. TABLA PRINCIPAL ───────────────────────────────────────
    // Proporciones de columnas del PDF original:
    const cW = [
      W * 0.22,   // ACTIVIDAD
      W * 0.26,   // ESTATUS
      W * 0.26,   // OBJETIVO
      W * 0.26,   // CUMPLIMIENTO
    ];

    // Helper dibuja celda
    const CEL = (
      cx: number, cy: number, cw: number, ch: number, txt: string,
      bold = false, fs = 8.5, al: 'left' | 'center' | 'right' = 'left',
      fill?: C3, wrap = false
    ): void => {
      if (fill) { doc.setFillColor(...fill); doc.rect(cx, cy, cw, ch, 'F'); }
      doc.setDrawColor(...GRAY1); doc.setLineWidth(0.3);
      doc.rect(cx, cy, cw, ch, 'S');
      if (!txt) return;
      doc.setFontSize(fs).setFont('helvetica', bold ? 'bold' : 'normal').setTextColor(...BLACK);
      const px = 2.5;
      const ax = al === 'center' ? cx + cw / 2 : cx + px;
      if (wrap) {
        const lines = doc.splitTextToSize(txt, cw - px * 2);
        const lh2   = fs * 0.43;
        const sy    = cy + Math.max(px + lh2, (ch - lines.length * lh2) / 2 + lh2);
        doc.text(lines, ax, sy, { align: al });
      } else {
        doc.text(txt, ax, cy + ch / 2 + (fs * 0.35 / 2), { align: al });
      }
    };

    const xT = ML;

    // Fila 1 — Título del proceso (full width, bold+italic, 2 líneas)
    const tituloH = 14;

doc.setDrawColor(...GRAY1);
doc.setLineWidth(0.3);
doc.rect(xT, y, W, tituloH, 'S');

doc.setFontSize(10)
   .setFont('helvetica', 'bolditalic')
   .setTextColor(...BLACK);

doc.text(
  'Proceso de seguimiento de actividades del programa "RECONECTA CON LA PAZ."',
  xT + W / 2,
  y + tituloH / 2 + 1.5,
  { align: 'center', maxWidth: W - 5 }
);

y += tituloH;

    // Fila 2 — Cabeceras de columnas (fondo gris claro)
    const cabH = 9;
    CEL(xT,                     y, cW[0], cabH, 'ACTIVIDAD',     true, 9, 'center', GRAY2);
    CEL(xT + cW[0],             y, cW[1], cabH, 'ESTATUS',       true, 9, 'center', GRAY2);
    CEL(xT + cW[0] + cW[1],     y, cW[2], cabH, 'OBJETIVO',      true, 9, 'center', GRAY2);
    CEL(xT + cW[0]+cW[1]+cW[2], y, cW[3], cabH, 'CUMPLIMIENTO',  true, 9, 'center', GRAY2);
    y += cabH;

    // Filas de actividades
    const actH = 14;  // altura de cada fila de actividad
    ACTIVIDADES.forEach(act => {
      const label   = LABELS[act];
      const estatus = v[`${act}Estatus`]      || '';
      const obj     = v[`${act}Objetivo`]     || '';
      const cumpl   = v[`${act}Cumplimiento`] || '';

      // Calcular altura real según contenido
      const estH  = estatus  ? doc.splitTextToSize(estatus,  cW[1] - 5).length * 4.5 + 5 : actH;
      const objH  = obj      ? doc.splitTextToSize(obj,      cW[2] - 5).length * 4.5 + 5 : actH;
      const cumH  = cumpl    ? doc.splitTextToSize(cumpl,    cW[3] - 5).length * 4.5 + 5 : actH;
      const rowH  = Math.max(actH, estH, objH, cumH);

      CEL(xT,                     y, cW[0], rowH, label,   true,  8.5, 'center');
      CEL(xT + cW[0],             y, cW[1], rowH, estatus, false, 8,   'left',   undefined, true);
      CEL(xT + cW[0] + cW[1],     y, cW[2], rowH, obj,     false, 8,   'left',   undefined, true);
      CEL(xT + cW[0]+cW[1]+cW[2], y, cW[3], rowH, cumpl,   false, 8,   'left',   undefined, true);
      y += rowH;
    });

    // Fila final — OBSERVACIONES (full width, label + valor)
    const obsLines = v.observaciones ? doc.splitTextToSize(v.observaciones, W - cW[0] - 5) : [];
    const obsH     = Math.max(18, obsLines.length * 4.5 + 7);
    CEL(xT,        y, cW[0],   obsH, 'OBSERVACIONES', true, 8.5, 'center');
    CEL(xT + cW[0], y, W - cW[0], obsH, v.observaciones || '', false, 8, 'left', undefined, true);

    return doc;
  }

  // ══════════════════════════════════════════════════════════════
  //  DESCARGA PDF
  // ══════════════════════════════════════════════════════════════

  async descargarPdf(): Promise<void> {
    this.estado.set({ activo: true, pct: 10, fase: 'Iniciando…', exito: false, error: '' });
    this.generando.set(true);
    try {
      this.estado.update(s => ({ ...s, pct: 40, fase: 'Generando PDF…' }));
      const doc = await this._pdf();
      this.estado.update(s => ({ ...s, pct: 92, fase: 'Preparando descarga…' }));
      doc.save(`plan_trabajo_individual.pdf`);
      this.estado.update(s => ({ ...s, pct: 100, fase: '¡PDF descargado!', exito: true }));
      this._fin(() => { this.generando.set(false); this.toast$('PDF descargado correctamente'); });
    } catch (e: any) {
      this.estado.update(s => ({ ...s, pct: 100, fase: 'Error', error: e?.message || '' }));
      this._fin(() => { this.generando.set(false); this.toast$('Error al generar el PDF', 'err'); });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  GUARDAR EN HISTORIAL + ZIP
  // ══════════════════════════════════════════════════════════════

  async guardar(): Promise<void> {
    this.estado.set({ activo: true, pct: 5, fase: 'Preparando expediente…', exito: false, error: '' });
    this.guardando.set(true);
    try {
      this.estado.update(s => ({ ...s, pct: 30, fase: 'Generando PDF…' }));
      const doc  = await this._pdf();
      const dUrl = doc.output('datauristring');
      const pNom = `PLAN_TRABAJO_INDIVIDUAL_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.pdf`;

      const e: EntradaHistorial = {
        id:       Date.now(),
        nombre:   `Plan ${new Date().toLocaleDateString('es-MX')}`,
        fecha:    new Date().toLocaleDateString('es-MX'),
        pdf:      { nombre: pNom, dataUrl: dUrl },
        archivos: [...this.adjuntos()],
      };
      this.historial.update(h => [e, ...h]);

      this.estado.update(s => ({ ...s, pct: 65, fase: 'Creando ZIP…' }));
      await this._jszip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const fL    = e.fecha.replace(/\//g, '-');
      const ruta  = `${fL}_PLAN-TRABAJO-INDIVIDUAL/`;
      zip.file(`${ruta}${san(pNom)}`, u8(dUrl));
      for (const a of this.adjuntos()) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));

      this.estado.update(s => ({ ...s, pct: 88, fase: 'Descargando ZIP…' }));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `plan_trabajo_individual.zip` }).click();
      URL.revokeObjectURL(url);

      this.estado.update(s => ({ ...s, pct: 100, fase: '¡Guardado!', exito: true }));
      this._fin(() => {
        this.guardando.set(false);
        this.verPrevia.set(false);
        this.toast$('Plan guardado en historial');
      });
    } catch (e: any) {
      this.estado.update(s => ({ ...s, pct: 100, fase: 'Error', error: e?.message || '' }));
      this._fin(() => { this.guardando.set(false); this.toast$('Error al guardar', 'err'); });
    }
  }

  private _fin(fn: () => void): void {
    setTimeout(() => {
      this.estado.set({ activo: false, pct: 0, fase: '', exito: false, error: '' });
      fn(); this.cdr.markForCheck();
    }, 2200);
  }

  // ── Historial ─────────────────────────────────────────────────
  borrar(id: number): void { this.historial.update(h => h.filter(e => e.id !== id)); this.toast$('Eliminado'); }
  dlExp(e: EntradaHistorial): void { this._dl(e.pdf.dataUrl, e.pdf.nombre); }
  dlAdj(a: Adjunto): void { this._dl(a.dataUrl, a.nombre); }

  async dlZip(e: EntradaHistorial): Promise<void> {
    this.estado.set({ activo: true, pct: 10, fase: 'Creando carpeta…', exito: false, error: '' });
    try {
      await this._jszip();
      const JSZip = (window as any).JSZip, zip = new JSZip();
      const ruta = `${e.fecha.replace(/\//g, '-')}_PLAN-TRABAJO-INDIVIDUAL/`;
      zip.file(`${ruta}${san(e.pdf.nombre)}`, u8(e.pdf.dataUrl));
      for (const a of e.archivos) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `plan_trabajo.zip` }).click();
      URL.revokeObjectURL(url);
      this.estado.update(s => ({ ...s, pct: 100, fase: '¡Descargado!', exito: true }));
      this._fin(() => this.toast$('Carpeta descargada'));
    } catch (err: any) {
      this.estado.update(s => ({ ...s, pct: 100, fase: 'Error', error: err?.message || '' }));
      this._fin(() => this.toast$('Error', 'err'));
    }
  }

  // ── Navegación ────────────────────────────────────────────────
  regresar(): void { this.router.navigate(['/']); }

  private _dl(url: string, name: string): void {
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
  }

  // ── Template helpers ──────────────────────────────────────────
  gv(k: string): any { return this.fg?.get(k)?.value; }
  icoAdj(t: string): string { return t?.includes('pdf') ? '📄' : t?.includes('image') ? '🖼️' : '📝'; }
  trunc(n: string, m = 26): string { return n.length > m ? n.slice(0, m - 3) + '…' : n; }
}

function san(s: string): string { return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim(); }
function u8(dataUrl: string): Uint8Array {
  const b = atob(dataUrl.split(',')[1]);
  const a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}