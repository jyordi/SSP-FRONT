/**
 * caratura-expediente.ts  — v2.0.0
 * Programa "Reconecta con la Paz" — DGPD y PC
 *
 * CAMBIOS v2.0.0:
 *  – completo / pendientes como signals (se actualizan en _watchPct)
 *    → Fix: el botón "Ver Vista Previa" aparece correctamente
 *  – PDF con paginación inteligente: si el contenido supera el área útil
 *    de la página Legal, añade nuevas páginas automáticamente
 *  – Botón "Regresar" en navbar → window.history.back()
 *  – Botón "Siguiente módulo" aparece cuando historial().length > 0
 *    (TODO: conectar al Router con la ruta real)
 *
 * FORMATO: Legal 215.8 × 355.4 mm (12240 × 20160 twips)
 * Márgenes: 12.7 mm (720 twips). Área útil: 190.4 × 330.0 mm
 */

import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule }          from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject }               from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// ════════════════════════════════════════════════════════════════
//  INTERFACES
// ════════════════════════════════════════════════════════════════

export interface Adjunto {
  id: number; nombre: string; tamano: number; tipo: string; dataUrl: string;
}
export interface EntradaHistorial {
  id: number; expediente: string; nombre: string; fecha: string;
  pdf: { nombre: string; dataUrl: string }; archivos: Adjunto[];
}
export interface EstadoPdf {
  activo: boolean; pct: number; fase: string; exito: boolean; error: string;
}

const CAMPOS_REQ = ['nombre'];

// ════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════

@Component({
  selector: 'app-caratura-expediente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './caratura-expediente.html',
  styleUrl: './caratura-expediente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaraturaExpediente implements OnInit, OnDestroy {

  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  // ── Signals UI ───────────────────────────────────────────────
  readonly tabActivo  = signal<'form' | 'hist'>('form');
  readonly verPrevia  = signal(false);
  readonly adjuntos   = signal<Adjunto[]>([]);
  readonly historial  = signal<EntradaHistorial[]>([]);
  readonly toast      = signal<{ msg: string; tipo: string }>({ msg: '', tipo: '' });
  readonly estado     = signal<EstadoPdf>({ activo: false, pct: 0, fase: '', exito: false, error: '' });
  readonly dragging   = signal(false);
  readonly generando  = signal(false);
  readonly guardando  = signal(false);

  /** Porcentaje de completitud — actualizado por _watchPct() */
  readonly pct        = signal(0);

  /**
   * ¡CRÍTICO! completo y pendientes son SIGNALS (no computed),
   * porque leen de this.fg.value que NO es un signal Angular.
   * Se actualizan junto con pct en _watchPct() a través de
   * la suscripción a fg.valueChanges.
   */
  readonly completo   = signal(false);
  readonly pendientes = signal<string[]>([]);

  readonly totalHistorial = computed(() => this.historial().length);


  /**
   * Marca de agua personalizable — OPCIONAL.
   * Se dibuja PRIMERO con GState opacity=0.12 (behindDoc).
   * Centrada, 175 × 175 mm. Vacío → sin marca.
   */
  readonly marcaUrl = signal<string>('');

  fg!: FormGroup;
  private readonly destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════════════════════
  //  CICLO DE VIDA
  // ══════════════════════════════════════════════════════════════

  ngOnInit(): void  { this._buildForm(); this._watchPct(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ══════════════════════════════════════════════════════════════
  //  FORMULARIO
  // ══════════════════════════════════════════════════════════════

  private _buildForm(): void {
    this.fg = this.fb.group({
      cPenal:            [''],
      expedienteTecnico: [''],
      nombre:            ['', Validators.required],
      alias:             [''],
      juzgado:           [''],
      delito:            [''],
      agraviado:         [''],
      fechaIngreso:      [''],
      fechaSuspension:   [''],
      fechaFenece:       [''],
      medidaCautelar:    [''],
      observacion:       [''],
    });
  }

  /**
   * Escucha cambios del formulario y actualiza simultáneamente:
   *  – pct        → barra de progreso
   *  – completo   → habilita el botón "Ver Vista Previa"
   *  – pendientes → chips de campos faltantes
   */
  private _watchPct(): void {
    const calc = () => {
      const v = this.fg?.value ?? {};
      const n = CAMPOS_REQ.filter(k => v[k] && v[k] !== '').length;
      this.pct.set(CAMPOS_REQ.length ? Math.round((n / CAMPOS_REQ.length) * 100) : 100);
      this.completo.set(CAMPOS_REQ.every(k => v[k] && v[k] !== ''));
      this.pendientes.set(CAMPOS_REQ.filter(k => !v[k] || v[k] === ''));
      this.cdr.markForCheck();
    };
    calc();
    this.fg.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(120))
      .subscribe(calc);
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
  //  GENERACIÓN DE PDF — RÉPLICA EXACTA + PAGINACIÓN INTELIGENTE
  //
  //  El documento está diseñado para una sola hoja Legal.
  //  Si el contenido de los campos de texto largo (delito,
  //  agraviado, medidaCautelar, observacion) hace que la tabla
  //  supere el límite inferior (YMAX), el motor agrega nuevas
  //  páginas automáticamente con mini-encabezado de continuación.
  //
  //  ALGORITMO:
  //  – cur = { y: number } → cursor Y compartido
  //  – pag(need) → si cur.y + need > YMAX → addPage() + mini-header
  //  – CEL() ya no avanza cur.y — solo dibuja la celda en la
  //    posición indicada. Las filas avanzan cur.y manualmente.
  //  – La tabla nunca se corta a mitad de una celda.
  //
  //  FORMATO: Legal 215.9 × 355.6 mm
  //  Márgenes: 12.7 mm (720 twips XML)
  //  Área útil: W ≈ 190.5 mm
  //
  //  Columnas [twips]: 1613|1529|1529|1529|1530|1530|1530 total=10790
  //  Porcentajes:      14.9% | 14.2% × 6
  // ══════════════════════════════════════════════════════════════

  private async _pdf(): Promise<any> {
    await this._jspdf();
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });
    const v   = this.fg.value;

    const PW   = doc.internal.pageSize.getWidth();   // 215.9
    const PH   = doc.internal.pageSize.getHeight();  // 355.6
    const ML   = 12.7;
    const MB   = 30;    // margen inferior (reservado para el pie de página)
    const W    = PW - ML * 2;
    const YMAX = PH - MB;   // límite inferior antes del pie de página

    type C3 = [number, number, number];
    const VINO:  C3 = [133, 10, 49];
    const BLACK: C3 = [0, 0, 0];
    const LGRAY: C3 = [185, 185, 185];
    const DGRAY: C3 = [80, 80, 80];
    const LBKG:  C3 = [228, 228, 228];

    // Columnas exactas del XML
    const T = 10790;
    const cW = [1613, 1529, 1529, 1529, 1530, 1530, 1530].map(t => W * (t / T));

    // Cursor compartido
    const cur = { y: ML };

    // ── Dibuja mini-encabezado en páginas de continuación ────
    const _miniHeader = () => {
      cur.y = ML;
      doc.setFillColor(...VINO);
      doc.rect(ML, cur.y, W, 1.2, 'F');
      cur.y += 2;
      doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(...VINO);
      doc.text(
        'CONTINUACIÓN — CARÁTULA DEL EXPEDIENTE · RECONECTA CON LA PAZ',
        PW / 2, cur.y + 3.5, { align: 'center' }
      );
      cur.y += 8;
    };

    // ── Paginación inteligente ────────────────────────────────
    const pag = (need: number) => {
      if (cur.y + need > YMAX) {
        doc.addPage();
        _miniHeader();
      }
    };

    // ── Dibuja pie de página en la página activa ──────────────
    const _dibujarPie = () => {
      const yPie = PH - ML - 24;
      doc.setFillColor(...VINO);
      doc.rect(ML, yPie, W, 1.2, 'F');
      doc.setFontSize(6.5).setFont('helvetica', 'normal').setTextColor(...DGRAY);
      doc.text(
        'PRIVADA 5ª, CALLE LAS ÁGUILAS, NUMÉRO 124 AV. UNIVERSIDAD, EX HACIENDA CANDIANI. OAXACA 2026',
        ML + W, yPie + 6, { align: 'right' }
      );
      doc.setFillColor(...VINO);
      doc.rect(ML, yPie + 9, W, 1.2, 'F');
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...VINO);
      doc.text('PROGRAMA "RECONECTA CON LA PAZ"', PW / 2, yPie + 19, { align: 'center' });
    };

    // ── Helper: dibuja una celda individual ──────────────────
    const CEL = (
      cx: number, cy: number, cw: number, ch: number, txt: string,
      bold   = false,
      fs     = 8.5,
      al:      'left' | 'center' | 'right' = 'left',
      wrap   = false,
      useLbg = false,
    ): void => {
      if (useLbg) { doc.setFillColor(...LBKG); doc.rect(cx, cy, cw, ch, 'F'); }
      doc.setDrawColor(...LGRAY); doc.setLineWidth(0.25);
      doc.rect(cx, cy, cw, ch, 'S');
      if (!txt) return;
      doc.setFontSize(fs).setFont('helvetica', bold ? 'bold' : 'normal').setTextColor(...BLACK);
      const px = 2;
      const ax = al === 'center' ? cx + cw / 2 : al === 'right' ? cx + cw - px : cx + px;
      if (wrap) {
        const lines = doc.splitTextToSize(txt, cw - px * 2);
        const lh2   = fs * 0.43;
        const sy    = cy + Math.max(px + lh2, (ch - lines.length * lh2) / 2 + lh2);
        doc.text(lines, ax, sy, { align: al });
      } else {
        doc.text(txt, ax, cy + ch / 2 + (fs * 0.35 / 2), { align: al });
      }
    };

    // ── Alturas de fila ───────────────────────────────────────
    const LH = 14;   // label rows
    const SH = 5.5;  // spacer rows
    const FH = 12;   // fecha rows
    const OH = 20;   // observacion (mínimo)

    // ──────────────────────────────────────────────────────────
    //  1. MARCA DE AGUA — SE DIBUJA PRIMERO, EN TODAS LAS PÁGINAS
    //     (se gestiona al final vía loop de páginas)
    // ──────────────────────────────────────────────────────────
    const _dibujarMarca = (pageNum: number) => {
      if (!this.marcaUrl()) return;
      try {
        const mS = 175;
        doc.setPage(pageNum);
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
        const ext = this.marcaUrl().split(';')[0].split('/')[1]?.toUpperCase() || 'PNG';
        doc.addImage(this.marcaUrl(), ext, (PW - mS) / 2, (PH - mS) / 2, mS, mS);
        doc.restoreGraphicsState();
      } catch { /* imagen inválida */ }
    };

    // ──────────────────────────────────────────────────────────
    //  2. ENCABEZADO INSTITUCIONAL (página 1)
    // ──────────────────────────────────────────────────────────
    doc.setFillColor(...VINO);
    doc.rect(ML, cur.y, W, 1.5, 'F');
    cur.y += 3;

    doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('SECRETARÍA DE SEGURIDAD Y PROTECCION CIUDADANA', PW / 2, cur.y + 4.5, { align: 'center' });
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(...BLACK);
    doc.text('SUBSECRETARÍA DE PREVENCION DEL DELITO Y REINSERCION SOCIAL', PW / 2, cur.y + 9, { align: 'center' });
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO Y PARTICIPACION CIUDADANA', PW / 2, cur.y + 13, { align: 'center' });
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...VINO);
    doc.text('"RECONECTA CON LA PAZ"', PW / 2, cur.y + 18.5, { align: 'center' });
    cur.y += 22;

    doc.setFillColor(...VINO);
    doc.rect(ML, cur.y, W, 1.2, 'F');
    cur.y += 4;

    // ──────────────────────────────────────────────────────────
    //  3. C. PENAL / EXPEDIENTE TÉCNICO (derecha)
    // ──────────────────────────────────────────────────────────
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...BLACK);
    doc.text(
      `C. PENAL:   ${v.cPenal || '_________________________'}`,
      ML + W, cur.y + 4.5, { align: 'right' }
    );
    doc.text(
      `EXPEDIENTE TÉCNICO:   ${v.expedienteTecnico || '___________________'}`,
      ML + W, cur.y + 10, { align: 'right' }
    );
    cur.y += 17;

    // ──────────────────────────────────────────────────────────
    //  4. TABLA PRINCIPAL
    // ──────────────────────────────────────────────────────────
    const xT   = ML;
    const wVal = W - cW[0];   // cols 1-6 combinadas


    // F1 — NOMBRE(S)
    // F1 — NOMBRE(S)  (valor ocupa cols 1-6 = wVal)
    CEL(xT, cur.y, cW[0], LH, 'NOMBRE (S):', true,  8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, LH, v.nombre || '', false, 8.5, 'left', true);
    cur.y += LH;
    // F2 — spacer
    CEL(xT, cur.y, cW[0], SH, '', false, 8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, SH, '');
    cur.y += SH;
    // F3 — ALIAS  (valor ocupa cols 1-6)
    CEL(xT, cur.y, cW[0], LH, 'ALIAS:', true,  8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, LH, v.alias || '', false, 8.5, 'left', true);
    cur.y += LH;
    // F4 — spacer
    CEL(xT, cur.y, cW[0], SH, '', false, 8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, SH, '');
    cur.y += SH;
    // F5 — JUZGADO  (valor ocupa cols 1-6)
    CEL(xT, cur.y, cW[0], LH, 'JUZGADO:', true,  8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, LH, v.juzgado || '', false, 8.5, 'left', true);
    cur.y += LH;

    // F6 — spacer
    pag(SH + LH + 10);
    CEL(xT, cur.y, cW[0], SH, '', false, 8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal, SH, '');
    cur.y += SH;

    // F7 — DELITO(S)
    const delLines = v.delito ? doc.splitTextToSize(v.delito, wVal - 4) : [];
    const delH = Math.max(LH, delLines.length * 4.5 + 5);
    pag(delH + SH + LH);
    CEL(xT, cur.y, cW[0], delH, 'DELITO (S):', true,  8.5, 'left', true,  true);
    CEL(xT + cW[0], cur.y, wVal,  delH, v.delito || '',  false, 8.5, 'left', true);
    cur.y += delH;
    // F8 — spacer
    CEL(xT, cur.y, cW[0], SH, '', false, 8.5, 'left', false, true);
    CEL(xT + cW[0], cur.y, wVal,  SH, '');
    cur.y += SH;

    // F9 — AGRAVIADO(S)
    const agrLines = v.agraviado ? doc.splitTextToSize(v.agraviado, wVal - 4) : [];
    const agrH = Math.max(LH, agrLines.length * 4.5 + 5);
    pag(agrH + SH);
    CEL(xT, cur.y, cW[0], agrH, 'AGRAVIADO (S):', true,  8.5, 'left', true,  true);
    CEL(xT + cW[0], cur.y, wVal,  agrH, v.agraviado || '', false, 8.5, 'left', true);
    cur.y += agrH;
    // F10 — spacer
    CEL(xT, cur.y, W, SH, '');
    cur.y += SH;

    // Proporciones de columnas para fechas (del XML del Word):
    const fL3 = cW[0] + cW[1] + cW[2];   // cols 0-2 = 43.3%
    const fR4 = cW[3] + cW[4] + cW[5] + cW[6];   // cols 3-6 = 56.7%
    const fL2 = cW[0] + cW[1];            // cols 0-1 = 29.1%
    const fR5 = cW[2] + cW[3] + cW[4] + cW[5] + cW[6];  // cols 2-6 = 70.9%

    // F11 — FECHA DE INGRESO AL PROGRAMA
    pag(FH + SH);
    CEL(xT, cur.y, fL3, FH, 'FECHA DE INGRESO AL PROGRAMA:', true,  8,   'left', true,  true);
    CEL(xT + fL3, cur.y, fR4, FH, v.fechaIngreso || '',         false, 8.5, 'left', false);
    cur.y += FH;
    CEL(xT, cur.y, W, SH, '');
    cur.y += SH;

    // F13 — FECHA DE SUSPENSIÓN DEL PROCESO
    pag(FH + SH);
    CEL(xT, cur.y, fL3, FH, 'FECHA DE SUSPENSIÓN DEL PROCESO:', true,  8,   'left', true,  true);
    CEL(xT + fL3, cur.y, fR4, FH, v.fechaSuspension || '',       false, 8.5, 'left', false);
    cur.y += FH;
    CEL(xT, cur.y, W, SH, '');
    cur.y += SH;

    // F15 — FECHA QUE FENECE LA SUPERVISIÓN
    pag(FH + SH);
    CEL(xT, cur.y, fL2, FH, 'FECHA QUE FENECE LA SUPERVISIÓN:', true,  8,   'left', true,  true);
    CEL(xT + fL2, cur.y, fR5, FH, v.fechaFenece || '',           false, 8.5, 'left', false);
    cur.y += FH;
    CEL(xT, cur.y, W, SH, '');
    cur.y += SH;

    // F17 — MEDIDA CAUTELAR
    const mcLines = v.medidaCautelar ? doc.splitTextToSize(v.medidaCautelar, fR4 - 4) : [];
    const mcH = Math.max(LH, mcLines.length * 4.5 + 5);
    pag(mcH + SH);
    CEL(xT,             cur.y, fL3,   mcH, 'MEDIDA CAUTELAR:', true,  8.5, 'left', true,  true);
    CEL(xT + fL3,            cur.y, cW[3], mcH, v.medidaCautelar || '', false, 8.5, 'left', true);
    CEL(xT + fL3 + cW[3],   cur.y, cW[4], mcH, '');
    CEL(xT + fL3+cW[3]+cW[4],cur.y, cW[5], mcH, '');
    CEL(xT + fL3+cW[3]+cW[4]+cW[5], cur.y, cW[6], mcH, '');
    cur.y += mcH;
    CEL(xT, cur.y, W, SH, '');
    cur.y += SH;

    // F19 — OBSERVACION
    const obsLines = v.observacion ? doc.splitTextToSize(v.observacion, wVal - 4) : [];
    const obsH = Math.max(OH, obsLines.length * 4.5 + 5);
    pag(obsH);
    CEL(xT, cur.y, cW[0], obsH, 'OBSERVACION:', true,  8.5, 'left', true,  true);
    CEL(xT + cW[0], cur.y, wVal,  obsH, v.observacion || '', false, 8.5, 'left', true);
    cur.y += obsH;

    // ──────────────────────────────────────────────────────────
    //  5. PIE DE PÁGINA + NUMERACIÓN (en todas las páginas)
    //     y MARCA DE AGUA
    // ──────────────────────────────────────────────────────────
    const totalPags = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= totalPags; p++) {
      doc.setPage(p);

      // Marca de agua
      _dibujarMarca(p);

      // Pie de página
      _dibujarPie();

      // Numeración
      if (totalPags > 1) {
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(140, 140, 140);
        doc.text(`Página ${p} de ${totalPags}`, PW / 2, PH - 5, { align: 'center' });
      }
    }

    return doc;
  }

  // ══════════════════════════════════════════════════════════════
  //  DESCARGA PDF
  // ══════════════════════════════════════════════════════════════

  async descargarPdf(): Promise<void> {
    this.estado.set({ activo: true, pct: 10, fase: 'Iniciando…', exito: false, error: '' });
    this.generando.set(true);
    try {
      this.estado.update(s => ({ ...s, pct: 35, fase: 'Cargando jsPDF…' }));
      const doc = await this._pdf();
      this.estado.update(s => ({ ...s, pct: 92, fase: 'Preparando descarga…' }));
      doc.save(`caratula_${san(this.fg.value.nombre || 'expediente')}.pdf`);
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
      const fg   = this.fg.value;
      const nom  = fg.nombre || 'SIN-NOMBRE';
      const exp  = fg.expedienteTecnico || `CAR-${Date.now()}`;
      const pNom = `CARATULA_${san(nom)}.pdf`;

      const e: EntradaHistorial = {
        id: Date.now(), expediente: exp, nombre: nom,
        fecha: new Date().toLocaleDateString('es-MX'),
        pdf: { nombre: pNom, dataUrl: dUrl },
        archivos: [...this.adjuntos()],
      };

      this.historial.update(h => {
        const i = h.findIndex(x => x.expediente === exp);
        if (i >= 0) { const c = [...h]; c[i] = { ...c[i], ...e, archivos: [...c[i].archivos, ...e.archivos] }; return c; }
        return [e, ...h];
      });

      this.estado.update(s => ({ ...s, pct: 65, fase: 'Creando ZIP…' }));
      await this._jszip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const carp  = san(exp);
      const fL    = e.fecha.replace(/\//g, '-');
      const ruta  = `${carp}/${fL}_CARATULA-EXPEDIENTE/`;
      zip.file(`${ruta}${san(pNom)}`, u8(dUrl));
      for (const a of this.adjuntos()) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));

      this.estado.update(s => ({ ...s, pct: 88, fase: 'Descargando ZIP…' }));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${carp}.zip` }).click();
      URL.revokeObjectURL(url);

      this.estado.update(s => ({ ...s, pct: 100, fase: '¡Expediente guardado!', exito: true }));
      this._fin(() => {
        this.guardando.set(false);
        this.verPrevia.set(false);
        this.toast$(`Carátula de ${nom} guardada`);
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
      const c = san(e.expediente), f = e.fecha.replace(/\//g, '-');
      const ruta = `${c}/${f}_CARATULA-EXPEDIENTE/`;
      zip.file(`${ruta}${san(e.pdf.nombre)}`, u8(e.pdf.dataUrl));
      for (const a of e.archivos) zip.file(`${ruta}${san(a.nombre)}`, u8(a.dataUrl));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${c}.zip` }).click();
      URL.revokeObjectURL(url);
      this.estado.update(s => ({ ...s, pct: 100, fase: '¡Descargado!', exito: true }));
      this._fin(() => this.toast$(`Carpeta ${c} descargada`));
    } catch (err: any) {
      this.estado.update(s => ({ ...s, pct: 100, fase: 'Error', error: err?.message || '' }));
      this._fin(() => this.toast$('Error al crear carpeta', 'err'));
    }
  }

  // ── Navegación ────────────────────────────────────────────────
  /** Regresa al Dashboard (pantalla de inicio) */
  regresar(): void { this.router.navigate(['/']); }

  /**
   * TODO: Conectar al Router con la ruta real del siguiente módulo.
   * Ejemplo: this.router.navigate(['/siguiente-modulo']);
   * Por ahora navega a la ruta raíz o muestra un alert.
   */
  /**
   * Navega al siguiente módulo del flujo.
   * El flujo recomendado: Valoración → Trabajo Social → Plan Trabajo → Carátula
   * Desde Carátula regresamos al Dashboard para iniciar un nuevo expediente.
   * TODO: si hay un flujo definido por expediente, pasar el ID como queryParam.
   */
  irSiguienteModulo(): void {
    this.router.navigate(['/proyecto-vida']); // TODO: actualizar con la ruta real del siguiente módulo
  }

  /** TODO: conectar con AuthService real */
  cerrarSesion(): void {
    if (confirm('¿Cerrar sesión?')) this.router.navigate(['/']);
  }

  private _dl(url: string, name: string): void {
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
  }

  // ── Template helpers ──────────────────────────────────────────
  gv(k: string): any { return this.fg?.get(k)?.value; }
  icoAdj(t: string): string { return t?.includes('pdf') ? '📄' : t?.includes('image') ? '🖼️' : '📝'; }
  trunc(n: string, m = 24): string { return n.length > m ? n.slice(0, m - 3) + '…' : n; }
}

// ════════════════════════════════════════════════════════════════
//  HELPERS DE MÓDULO
// ════════════════════════════════════════════════════════════════

function san(s: string): string { return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim(); }
function u8(dataUrl: string): Uint8Array {
  const b = atob(dataUrl.split(',')[1]);
  const a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}