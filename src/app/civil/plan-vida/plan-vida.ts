import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-plan-vida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-vida.html',
  styleUrl: './plan-vida.css'
})
export class PlanVidaComponent implements OnInit {
  @Input() expediente: any;

  planForm!: FormGroup;
  cargando = true;
  guardando = false;
  generandoPDF = false;
  f3IdPropio: string | null = null;
  f3Existente = false;
  sinF3 = false;

  readonly ACTIVIDADES_BASE = [
    'EDUCATIVA',
    'PSICOSOCIAL',
    'PSICOLÓGICA',
    'ADICCIONES',
    'FAMILIAR',
    'LABORAL',
    'DEPORTIVA',
    'CULTURAL'
  ];

  constructor(
    private fb: FormBuilder,
    private civico: Civico,
    private session: SessionService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.planForm = this.fb.group({
      fechaInicioEstimada: [new Date().toISOString().split('T')[0]],
      fechaTerminoEstimada: [''],
      diasAsignados: [''],
      metasPrograma: [''],
      observacionesPlan: [''],
      actividades: this.fb.array([])
    });
  }

  get actividades(): FormArray {
    return this.planForm.get('actividades') as FormArray;
  }

  private crearFilaActividad(nombre: string, state: any = {}): FormGroup {
    return this.fb.group({
      nombre: [nombre],
      estadoInicial: [state.estadoInicial || ''],
      accion: [state.accion || state.objetivo || ''],
      vinculacion: [state.vinculacion || ''],
      temporalidad: [state.temporalidad || ''],
      seguimiento: [state.seguimiento || ''],
      observaciones: [state.observaciones || state.cumplimiento || ''],
      // Compatibilidad backend/Word
      estatus: [state.estatus || state.estadoInicial || 'PENDIENTE'],
      objetivo: [state.objetivo || state.accion || ''],
      cumplimiento: [state.cumplimiento || state.observaciones || '']
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    this.cargando = true;
    this.civico.obtenerF3PorExpediente(expId).subscribe({
      next: (res: any) => {
        if (res && (res.id || res.idUUID)) {
          this.f3Existente = true;
          this.f3IdPropio = res.idUUID || res.id;

          this.planForm.patchValue({
            fechaInicioEstimada: res.fechaInicioEstimada || new Date().toISOString().split('T')[0],
            fechaTerminoEstimada: res.fechaTerminoEstimada || '',
            diasAsignados: res.diasAsignados || '',
            metasPrograma: res.metasPrograma || '',
            observacionesPlan: res.observacionesPlan || ''
          });

          if (res.actividadesPlan && typeof res.actividadesPlan === 'object') {
            this.actividades.clear();
            const keys = Object.keys(res.actividadesPlan);
            if (keys.length > 0) {
              keys.forEach(key => {
                const act = res.actividadesPlan[key];
                this.actividades.push(this.crearFilaActividad(key, act));
              });
            } else {
              this.ACTIVIDADES_BASE.forEach(act => this.actividades.push(this.crearFilaActividad(act)));
            }
          }
        } else {
          this.inicializarPlanVacio();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.inicializarPlanVacio();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private inicializarPlanVacio() {
    this.f3Existente = false;
    this.actividades.clear();
    this.ACTIVIDADES_BASE.forEach(act => this.actividades.push(this.crearFilaActividad(act)));
  }

  guardarPlan() {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    this.guardando = true;

    // Convertir FormArray a Diccionario para el Backend
    const dictActividades: any = {};
    this.actividades.value.forEach((act: any) => {
      dictActividades[act.nombre] = {
        estadoInicial: act.estadoInicial,
        accion: act.accion,
        vinculacion: act.vinculacion,
        temporalidad: act.temporalidad,
        seguimiento: act.seguimiento,
        observaciones: act.observaciones,
        // Duplicidad para compatibilidad con Word F3
        estatus: act.estadoInicial || 'PENDIENTE',
        objetivo: act.accion || '',
        cumplimiento: act.observaciones || ''
      };
    });

    const payload = {
      expedienteId: expId,
      coordinadorId: this.session.getUserId() || null,
      fechaInicioEstimada: this.planForm.get('fechaInicioEstimada')?.value,
      fechaTerminoEstimada: this.planForm.get('fechaTerminoEstimada')?.value,
      diasAsignados: this.planForm.get('diasAsignados')?.value?.toString(),
      metasPrograma: this.planForm.get('metasPrograma')?.value,
      observacionesPlan: this.planForm.get('observacionesPlan')?.value,
      actividadesPlan: dictActividades
    };

    if (this.f3Existente && this.f3IdPropio) {
      this.civico.actualizarF3(this.f3IdPropio, payload).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.manejarError(err)
      });
    } else {
      this.civico.crearF3(payload).subscribe({
        next: (res: any) => {
          this.f3Existente = true;
          this.f3IdPropio = res.idUUID || res.id;
          this.finalizarGuardado();
        },
        error: (err) => this.manejarError(err)
      });
    }
  }

  private finalizarGuardado() {
    this.guardando = false;
    this.toast.showSuccess("Plan de Trabajo (F3) guardado correctamente.");
    this.cdr.detectChanges();
  }

  private manejarError(err: any) {
    this.guardando = false;
    const msg = err.error?.message || err.message;
    this.toast.showError('Error al guardar: ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    this.cdr.detectChanges();
  }

  descargarPlanPDF() {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    console.log("--- DEBUG PDF PLAN DE VIDA ---");
    console.log("Enviando ID de expediente:", expId);
    console.log("Datos del expediente completo:", this.expediente);
    console.log("Valores actuales del formulario (Proyecto de Vida):", this.planForm.value);

    this.generandoPDF = true;
    this.civico.generarDocumentoPDF('plan-vida', expId).subscribe({
      next: (blob: Blob) => {
        console.log("Respuesta recibida (Blob del PDF)");
        this.generandoPDF = false;
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `Plan_Vida_${this.expediente.beneficiario?.nombre || 'Beneficiario'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.generandoPDF = false;
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
        this.cdr.detectChanges();
      }
    });
  }
}
