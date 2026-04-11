import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './ficha-tecnica.html',
  styleUrls: ['./ficha-tecnica.css'],
})
export class FichaTecnica implements OnInit {

  @Input() expedienteId!: string;
  @Input() datosExpediente: any = null;
  @Input() datosCompletos: any = null;
  @Input() modoSoloLectura: boolean = false;

  private fb = inject(FormBuilder);
  private civicoService = inject(Civico);
  private session = inject(SessionService);
  private toast = inject(ToastService);

  f4Form: FormGroup = new FormGroup({});

  cargando = true;
  guardando = false;
  guardadoExito = false;
  generandoPDF = false;

  f4Existente = false;
  f4Id: string | null = null;
  f4Estatus: string = 'PENDIENTE';
  modalidadFalta: string = '';
  mostrarModalModalidad = false;

  estatusOpciones = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CERRADO'];

  /** Solo Admin puede crear/editar/generar */
  get puedeEditar(): boolean {
    return this.session.esAdmin() && !this.modoSoloLectura;
  }

  get beneficiario() {
    return this.datosCompletos?.beneficiario || this.datosExpediente?.beneficiario;
  }

  get expedienteInfo() {
    return this.datosCompletos?.expediente || this.datosExpediente;
  }

  get proyectoVida() {
    return this.datosCompletos?.f1?.proyectoVida || {};
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

      // 5 categorías de seguimiento
      educativa:    [''],
      laboral:      [''],
      familiar:     [''],
      deportivo:    [''],
      cultural:     [''],

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
          estatusF4:   res.estatusF4      || 'PENDIENTE',
        });

        this.cargando = false;
        this.aplicarModoLectura();
      },
      error: (err: any) => {
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
        error: (err: any) => this.manejarError(err),
      });
    } else {
      this.civicoService.crearF4(payload).subscribe({
        next: (res: any) => {
          this.f4Existente = true;
          this.f4Id = res.idUUID || res.id;
          this.finalizarGuardado();
        },
        error: (err: any) => this.manejarError(err),
      });
    }
  }

  generarPDF() {
    if (!this.puedeEditar) return;
    
    // Si ya tenemos la modalidad en el objeto de expediente, la pre-llenamos
    this.modalidadFalta = this.datosExpediente?.modalidadFalta || '';
    this.mostrarModalModalidad = true;
  }

  cancelarDescarga() {
    this.mostrarModalModalidad = false;
    this.modalidadFalta = '';
  }

  confirmarYDescargar() {
    if (!this.modalidadFalta || this.modalidadFalta.trim() === '') {
      this.toast.showError('Ingresa la modalidad para continuar.');
      return;
    }

    this.mostrarModalModalidad = false;
    this.generandoPDF = true;

    // 1. Actualizar el expediente con la nueva modalidad
    this.civicoService.actualizarExpedienteCivico(this.expedienteId, {
      modalidadFalta: this.modalidadFalta.trim().toUpperCase()
    }).subscribe({
      next: () => {
        this.toast.showSuccess("Modalidad actualizada. Generando PDF...");
        // 2. Si se actualizó bien, llamar a la generación de PDF
        this.civicoService.generarDocumentoPDF('f4-cedula-inicial', this.expedienteId).subscribe({
          next: (blob: any) => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            this.generandoPDF = false;
            // Actualizar localmente para la siguiente vez
            if (this.datosExpediente) {
              this.datosExpediente.modalidadFalta = this.modalidadFalta.trim().toUpperCase();
            }
          },
          error: (err: any) => this.manejarErrorPDF(err)
        });
      },
      error: (err: any) => {
        this.generandoPDF = false;
        this.toast.showError('Error al actualizar modalidad: ' + (err.error?.message || err.message));
      }
    });
  }

  private manejarErrorPDF(err: any) {
    this.generandoPDF = false;
    let msg = err.error?.message || err.message;
    if (Array.isArray(msg)) msg = msg.join(', ');
    this.toast.showError(`Error al generar PDF: ${msg}`);
  }

  private finalizarGuardado() {
    this.guardando = false;
    this.toast.showSuccess("Ficha Técnica (F4) guardada correctamente.");
    this.f4Estatus = this.f4Form.getRawValue().estatusF4 || this.f4Estatus;
  }

  private manejarError(err: any) {
    this.guardando = false;
    let msg = 'Error desconocido';
    if (err.error?.message) {
      msg = Array.isArray(err.error.message)
        ? err.error.message.join('\n')
        : err.error.message;
    }
    this.toast.showError('Error al guardar F4: ' + msg);
    console.error('F4 error:', err);
  }
}
