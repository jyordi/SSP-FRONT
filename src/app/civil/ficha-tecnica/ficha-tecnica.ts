import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ficha-tecnica.html',
  styleUrls: ['./ficha-tecnica.css'],
})
export class FichaTecnica implements OnInit {

  @Input() expedienteId!: string;
  @Input() datosExpediente: any = null;
  @Input() modoSoloLectura: boolean = false;

  private fb = inject(FormBuilder);
  private civicoService = inject(Civico);
  private session = inject(SessionService);

  f4Form: FormGroup = new FormGroup({});

  cargando = true;
  guardando = false;
  guardadoExito = false;
  generandoPDF = false;

  f4Existente = false;
  f4Id: string | null = null;
  f4Estatus: string = 'PENDIENTE';

  estatusOpciones = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CERRADO'];

  /** Solo Admin puede crear/editar/generar */
  get puedeEditar(): boolean {
    return this.session.esAdmin() && !this.modoSoloLectura;
  }

  ngOnInit() {
    this.initForm();
    if (this.expedienteId) {
      this.cargarF4();
    } else {
      this.cargando = false;
    }
  }

  private initForm() {
    this.f4Form = this.fb.group({
      // Proceso de ingreso
      procesoIngreso: [''],

      // 6 categorías de seguimiento (incluye PSICOLÓGICA)
      educativa:    [''],
      laboral:      [''],
      familiar:     [''],
      deportivo:    [''],
      cultural:     [''],
      psicologica:  [''],

      estatusF4: ['PENDIENTE', Validators.required],
    });
  }

  private cargarF4() {
    this.cargando = true;
    this.civicoService.obtenerF4PorExpediente(this.expedienteId).subscribe({
      next: (res: any) => {
        this.f4Existente = true;
        this.f4Id = res.idUUID || res.id;
        this.f4Estatus = res.estatusF4 || 'PENDIENTE';

        const act = res.seguimientoActividades || {};

        this.f4Form.patchValue({
          procesoIngreso: res.procesoIngreso || '',
          educativa:   act['EDUCATIVA']   || '',
          laboral:     act['LABORAL']     || '',
          familiar:    act['FAMILIAR']    || '',
          deportivo:   act['DEPORTIVO']   || '',
          cultural:    act['CULTURAL']    || '',
          psicologica: act['PSICOLOGICA'] || '',
          estatusF4:   res.estatusF4      || 'PENDIENTE',
        });

        this.cargando = false;
        this.aplicarModoLectura();
      },
      error: (err) => {
        this.cargando = false;
        if (err.status !== 404) {
          console.error('Error al cargar F4:', err);
        }
        this.aplicarModoLectura();
      }
    });
  }

  private aplicarModoLectura() {
    if (!this.puedeEditar) {
      this.f4Form.disable();
    } else {
      this.f4Form.enable();
    }
  }

  /** Construye el payload que espera el backend */
  private buildPayload(): any {
    const v = this.f4Form.getRawValue();
    return {
      expedienteId:  this.expedienteId,
      coordinadorId: this.session.getUserId() || 1,
      procesoIngreso: v.procesoIngreso || undefined,
      seguimientoActividades: {
        EDUCATIVA:   v.educativa   || undefined,
        LABORAL:     v.laboral     || undefined,
        FAMILIAR:    v.familiar    || undefined,
        DEPORTIVO:   v.deportivo   || undefined,
        CULTURAL:    v.cultural    || undefined,
        PSICOLOGICA: v.psicologica || undefined,
      },
      estatusF4: v.estatusF4 || 'EN_PROCESO',
    };
  }

  guardar() {
    if (!this.puedeEditar || this.f4Form.invalid) return;

    this.guardando = true;
    this.guardadoExito = false;
    const payload = this.buildPayload();

    if (this.f4Existente && this.f4Id) {
      this.civicoService.actualizarF4(this.f4Id, payload).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.manejarError(err),
      });
    } else {
      this.civicoService.crearF4(payload).subscribe({
        next: (res: any) => {
          this.f4Existente = true;
          this.f4Id = res.idUUID || res.id;
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err),
      });
    }
  }

  generarPDF() {
    if (!this.puedeEditar) return;
    this.generandoPDF = true;
    this.civicoService.generarDocumentoPDF('f4-cedula-inicial', this.expedienteId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.generandoPDF = false;
      },
      error: (err) => {
        this.generandoPDF = false;
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
      },
    });
  }

  private finalizarGuardado() {
    this.guardando = false;
    this.guardadoExito = true;
    this.f4Estatus = this.f4Form.getRawValue().estatusF4 || this.f4Estatus;
    setTimeout(() => (this.guardadoExito = false), 3500);
  }

  private manejarError(err: any) {
    this.guardando = false;
    let msg = 'Error desconocido';
    if (err.error?.message) {
      msg = Array.isArray(err.error.message)
        ? err.error.message.join('\n')
        : err.error.message;
    }
    alert('Error al guardar la Ficha Técnica:\n\n' + msg);
    console.error('F4 error:', err);
  }
}
