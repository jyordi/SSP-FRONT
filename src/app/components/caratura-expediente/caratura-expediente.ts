import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";
import { ExpedientesService } from '../../services/expedientes';
import { PenalService } from '../../services/penal';

export interface Adjunto {
  id: number; nombre: string; tamano: number; tipo: string; dataUrl: string;
}
export interface EstadoPdf {
  activo: boolean; pct: number; fase: string; exito: boolean; error: string;
}

const CAMPOS_REQ = ['nombre'];

@Component({
  selector: 'app-caratura-expediente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './caratura-expediente.html',
  styleUrl: './caratura-expediente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaraturaExpediente implements OnInit, OnDestroy {

  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  
  private readonly expedientesService = inject(ExpedientesService);
  private readonly penalService = inject(PenalService);

  expedienteId: number | null = null;
  expedienteBase: any = null;
  caratulaBackend: any = null; 

  // ── Signals UI ───────────────────────────────────────────────
  readonly tabActivo  = signal<'form' | 'hist'>('form');
  readonly verPrevia  = signal(false);
  readonly adjuntos   = signal<Adjunto[]>([]);
  readonly toast      = signal<{ msg: string; tipo: string }>({ msg: '', tipo: '' });
  readonly estado     = signal<EstadoPdf>({ activo: false, pct: 0, fase: '', exito: false, error: '' });
  readonly dragging   = signal(false);
  readonly generando  = signal(false);
  readonly guardando  = signal(false);
  
  // 🔥 Señal para la animación de salida a Detalle Penal
  readonly saliendo   = signal(false);

  readonly pct        = signal(0);
  readonly completo   = signal(false);
  readonly pendientes = signal<string[]>([]);

  readonly marcaUrl = signal<string>('');

  fg!: FormGroup;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void { 
    this._buildForm(); 
    this._watchPct(); 

    const paramId = this.route.snapshot.params['id'];
    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;

    if (navState?.expediente) {
      this.expedienteId = navState.expediente.id;
    } else if (paramId) {
      this.expedienteId = +paramId;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try { this.expedienteId = JSON.parse(raw)?.id ?? null; } catch { }
      }
    }

    if (this.expedienteId) {
      this._cargarDatos();
    } else {
      this.toast$('No se encontró el ID del expediente', 'err');
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ══════════════════════════════════════════════════════════════
  //  CARGA DE DATOS DEL BACKEND
  // ══════════════════════════════════════════════════════════════
  private _cargarDatos(): void {
    this.expedientesService.getResumenPenal(this.expedienteId!).subscribe({
      next: (res: any) => {
        this.expedienteBase = res.expediente ?? res;
        this._autoRellenar(this.expedienteBase, res.beneficiario ?? this.expedienteBase.beneficiario);
        this._cargarCaratulaBackend();
      },
      error: () => this.toast$('Error al cargar expediente base', 'err')
    });
  }

  private _cargarCaratulaBackend(): void {
    this.penalService.getCaratulaByExpediente(this.expedienteId!).subscribe({
      next: (caratula) => {
        this.caratulaBackend = caratula;
        this.fg.patchValue({
          nombre: caratula.nombre ?? '',
          alias: caratula.alias ?? '',
          juzgado: caratula.juzgado ?? '',
          delito: caratula.delito ?? '',
          agraviado: caratula.agraviado ?? '',
          fechaIngreso: caratula.fechaIngresoPrograma ? caratula.fechaIngresoPrograma.slice(0,10) : '',
          fechaSuspension: caratula.fechaSuspensionProceso ? caratula.fechaSuspensionProceso.slice(0,10) : '',
          fechaFenece: caratula.fechaFinSupervision ? caratula.fechaFinSupervision.slice(0,10) : '',
          medidaCautelar: caratula.medidaCautelar ?? '',
          observacion: caratula.observaciones ?? ''
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status !== 404) console.error('Error al verificar carátula', err);
      }
    });
  }

  private _autoRellenar(exp: any, benef: any): void {
    if (!this.fg) return;
    const nombre = benef?.nombre ?? benef?.nombreCompleto ?? `${benef?.nombre ?? ''} ${benef?.apellidoPaterno ?? ''} ${benef?.apellidoMaterno ?? ''}`.trim() ?? exp?.nombre ?? '';
    const patch: Record<string, any> = {};

    patch['cPenal'] = ''; 
    if (exp?.noExpediente) patch['expedienteTecnico'] = exp.noExpediente;
    if (nombre) patch['nombre'] = nombre;
    if (exp?.delito) patch['delito'] = exp.delito;
    if (exp?.juzgado) patch['juzgado'] = exp.juzgado;
    if (exp?.agraviado) patch['agraviado'] = exp.agraviado;
    if (exp?.medidaCautelar) patch['medidaCautelar'] = exp.medidaCautelar;
    if (exp?.fechaIngresoPrograma) patch['fechaIngreso'] = exp.fechaIngresoPrograma.slice(0, 10);
    
    this.fg.patchValue(patch, { emitEvent: false });
  }

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
    this.fg.valueChanges.pipe(takeUntil(this.destroy$), debounceTime(120)).subscribe(calc);
  }

  // ══════════════════════════════════════════════════════════════
  //  GUARDAR EN BACKEND Y REDIRIGIR A DETALLE PENAL
  // ══════════════════════════════════════════════════════════════
  guardarEnBackend(): void {
    if (!this.expedienteId) { this.toast$('No hay expediente', 'err'); return; }
    
    this.guardando.set(true);
    const v = this.fg.value;

    const payload = {
      expedienteId: this.expedienteId,
      nombre: v.nombre,
      alias: v.alias,
      juzgado: v.juzgado,
      delito: v.delito,
      agraviado: v.agraviado,
      fechaIngresoPrograma: v.fechaIngreso || null,
      fechaSuspensionProceso: v.fechaSuspension || null,
      fechaFinSupervision: v.fechaFenece || null,
      medidaCautelar: v.medidaCautelar,
      observaciones: v.observacion
    };

    // 🔥 IMPRESIÓN EN CONSOLA DEL PAYLOAD ENVIADO
    console.group('%c🚀 ENVIANDO DATOS A BACKEND (CARÁTULA)', 'color: #3498db; font-weight: bold; font-size: 14px');
    console.log('Ruta: /penal/expediente-caratula');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.groupEnd();

    const onExito = (res: any) => {
      // 🔥 IMPRESIÓN EN CONSOLA DE LA RESPUESTA
      console.group('%c✅ RESPUESTA DEL BACKEND (ÉXITO)', 'color: #2ecc71; font-weight: bold; font-size: 14px');
      console.log('Datos guardados:', res);
      console.groupEnd();

      this.caratulaBackend = res;
      this.guardando.set(false);
      this.toast$('Carátula guardada con éxito');
      
      // Auto-descargar PDF y luego salir
      this._descargarPdfYSalir(res.id);
    };

    const onError = (err: any) => {
      // 🔥 IMPRESIÓN EN CONSOLA DEL ERROR
      console.group('%c❌ ERROR DEL BACKEND', 'color: #e74c3c; font-weight: bold; font-size: 14px');
      console.error(err);
      console.groupEnd();

      if(err.status === 409) this.toast$(err.error?.message || 'Faltan módulos previos', 'err');
      else this.toast$('Error al guardar', 'err'); 
      this.guardando.set(false);
    };

    if (this.caratulaBackend?.id) {
      this.penalService.updateCaratula(this.caratulaBackend.id, payload).subscribe({
        next: onExito,
        error: onError
      });
    } else {
      this.penalService.saveCaratula(payload).subscribe({
        next: onExito,
        error: onError
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  DESCARGAR PDF AUTOMÁTICO Y REDIRIGIR
  // ══════════════════════════════════════════════════════════════
  private _descargarPdfYSalir(caratulaId: number): void {
    this.generando.set(true);
    this.toast$('Generando PDF...');

    this.penalService.getCaratulaPdf(caratulaId).subscribe({
      next: (blob: Blob) => {
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Caratula_${this.fg.value.nombre || 'Expediente'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('📄 PDF descargado automáticamente.');
        }
        this._iniciarAnimacionSalida();
      },
      error: (err) => { 
        console.error('Error al generar PDF automáticamente', err);
        this.toast$('No se pudo descargar el PDF', 'err'); 
        this._iniciarAnimacionSalida();
      }
    });
  }

  // 🔥 ANIMACIÓN Y REDIRECCIÓN A DETALLE PENAL
  private _iniciarAnimacionSalida(): void {
    this.generando.set(false);
    this.verPrevia.set(false);
    this.saliendo.set(true); // Activa la capa de carga blanca
    this.cdr.markForCheck();

    setTimeout(() => {
      // Ajusta esta ruta a tu ruta exacta de Detalle Penal
      this.router.navigate(['/detalle-penal', this.expedienteId]); 
    }, 1200); // 1.2 segundos para mostrar el spinner y redirigir
  }

  // Descarga manual (cuando se le da click desde el historial)
  descargarPdfBackend(): void {
    if (!this.caratulaBackend?.id) return;
    this.generando.set(true);
    this.penalService.getCaratulaPdf(this.caratulaBackend.id).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) { this.toast$('PDF vacío', 'err'); this.generando.set(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Caratula_${this.fg.value.nombre || 'Expediente'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.generando.set(false);
        this.toast$('PDF descargado');
      },
      error: () => { this.toast$('Error al descargar PDF del servidor', 'err'); this.generando.set(false); }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  ARCHIVOS Y MARCA DE AGUA
  // ══════════════════════════════════════════════════════════════
  onFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = e => {
        this.adjuntos.update(a => [...a, { id: Date.now() + Math.random(), nombre: f.name, tamano: f.size, tipo: f.type, dataUrl: e.target!.result as string }]);
        this.cdr.markForCheck();
      };
      r.readAsDataURL(f);
    });
  }
  quitarAdj(id: number): void { this.adjuntos.update(a => a.filter(x => x.id !== id)); }

  cargarMarca(file: File | null): void {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => { this.marcaUrl.set(e.target!.result as string); this.cdr.markForCheck(); };
    r.readAsDataURL(file);
  }
  quitarMarca(): void { this.marcaUrl.set(''); }

  toast$(msg: string, tipo: 'ok' | 'err' = 'ok'): void {
    this.toast.set({ msg, tipo });
    setTimeout(() => { this.toast.set({ msg: '', tipo: '' }); this.cdr.markForCheck(); }, 3500);
  }

  regresar(): void { this.router.navigate(['/expedientes']); }
  
  gv(k: string): any { return this.fg?.get(k)?.value; }
  icoAdj(t: string): string { return t?.includes('pdf') ? '📄' : t?.includes('image') ? '🖼️' : '📝'; }
  trunc(n: string, m = 24): string { return n.length > m ? n.slice(0, m - 3) + '…' : n; }
}

function san(s: string): string { return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim(); }