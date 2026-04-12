import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { jsPDF } from 'jspdf';
import { WordGeneratorService } from '../../services/word-generator.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-plan-individual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-ts-civico.html',
  styleUrls: ['./plan-ts-civico.css']
})
export class PlanIndividualComponent implements OnInit, OnChanges {
  @Input() modoSoloLectura: boolean = false;
  @Input() expedienteId!: string;
  @Input() datosExpediente: any;
  @Input() datosCompletos: any;

  planForm!: FormGroup;

  f3Existente = false;
  f3IdPropio: string | number | null = null;

  guardando = false;
  guardadoExito = false;
  generandoPDF = false;

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
    private civicoService: Civico,
    private session: SessionService,
    private wordGenerator: WordGeneratorService,
    private toast: ToastService
  ) { }

  esAdmin(): boolean {
    return this.session.getRole() === 'admin';
  }

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expedienteId'] && this.expedienteId) {
      this.verificarF3();
    }

    // Bloquear formulario si es solo lectura
    if (this.modoSoloLectura && this.planForm) {
      this.planForm.disable();
    }
  }

  private initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.planForm = this.fb.group({
      fechaInicioEstimada: [today],
      fechaTerminoEstimada: [''],
      diasAsignados: [''],
      metasPrograma: [''],
      observacionesPlan: [''],
      // Esferas de vida (Proyecto de Vida F3)
      personal: [''],
      familiar: [''],
      social: [''],
      actividades: this.fb.array([])
    });

    if (this.modoSoloLectura) {
      this.planForm.disable();
    }


    // Rellenamos el FormArray con las tablas base
    this.ACTIVIDADES_BASE.forEach(act => {
      this.actividades.push(this.crearFilaActividad(act));
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
      estatus: [state.estatus || state.estadoInicial || ''],
      objetivo: [state.objetivo || state.accion || ''],
      cumplimiento: [state.cumplimiento || state.observaciones || '']
    });
  }

  private verificarF3() {
    if (!this.expedienteId) return;

    this.civicoService.obtenerF3PorExpediente(this.expedienteId).subscribe({
      next: (res: any) => {
        if (res && (res.id || res.idUUID)) {
          this.f3Existente = true;
          this.f3IdPropio = res.idUUID || res.id;

          // Set values base
          this.planForm.patchValue({
            fechaInicioEstimada: res.fechaInicioEstimada || new Date().toISOString().split('T')[0],
            fechaTerminoEstimada: res.fechaTerminoEstimada || '',
            diasAsignados: res.diasAsignados || '',
            metasPrograma: res.metasPrograma || '',
            observacionesPlan: res.observacionesPlan || '',
            personal: res.proyectoVidaF3?.personal || '',
            familiar: res.proyectoVidaF3?.familiar || '',
            social: res.proyectoVidaF3?.social || ''
          });

          // Si el Proyecto de Vida en F3 está vacío, intentar auto-rellenar desde F1
          if (!res.proyectoVidaF3?.personal && !res.proyectoVidaF3?.familiar && !res.proyectoVidaF3?.social) {
            this.intentarAutoRellenarDesdeF1(this.expedienteId);
          }

          // Reconstruir form arrays con el diccionario actividadesPlan
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

          // Bloqueo duro: Si es solo lectura, deshabilitamos todo el formulario de nuevo 
          // después de haber inyectado los nuevos controles.
          if (this.modoSoloLectura) {
            this.planForm.disable();
          }
        }
      },
      error: () => {
        this.f3Existente = false;
        // Si no existe, mantenemos el form vacío que ya creó initForm()
        this.intentarAutoRellenarDesdeF1(this.expedienteId);
        if (this.modoSoloLectura) {
          this.planForm.disable();
          // ES CREACIÓN, Verificar dependencias previas (CANDADO F3) de forma local o remota
          this.verificarFlujoLocal();
        }
      }
    });

    // Validar si tampoco hay datosExpediente cargados por el Input, intentamos bajarlos (Opcional)
    if (!this.datosExpediente) {
      this.civicoService.getExpedienteCivico(this.expedienteId).subscribe(res => {
        this.datosExpediente = res;
      });
    }
  }

  bloqueadoPorFlujo = false;
  mensajeBloqueo = '';

  private verificarFlujoLocal() {
    const f1 = this.datosCompletos?.f1;
    const f2 = this.datosCompletos?.f2;

    const f1Completado = f1?.estatusF1 === 'COMPLETADO' || f1?.estatus === 'COMPLETADO' || f1?.id; // backend a veces omite estatus, validamos id al menos, pero el backend exige COMPLETADO.
    const f2Completado = f2?.estatusF2 === 'COMPLETADO' || f2?.estatus === 'COMPLETADO';

    // Como el MSJ de error del servidor era explícito (RF-008):
    if (!f1Completado || !f2Completado) {
      this.bloqueadoPorFlujo = true;
      this.mensajeBloqueo = 'Aún no puedes crear el Plan de Trabajo: Las Fichas de Entrevista Clínica (F1) y Estudio Socioeconómico (F2) deben llenarse primero.';
      this.planForm.disable();
    } else {
      this.bloqueadoPorFlujo = false;
      this.mensajeBloqueo = '';
    }
  }

  private intentarAutoRellenarDesdeF1(expedienteId: string) {
    this.civicoService.obtenerF1PorExpediente(expedienteId).subscribe({
      next: (f1: any) => {
        if (f1 && f1.proyectoVida) {
          this.planForm.patchValue({
            personal: this.planForm.get('personal')?.value || f1.proyectoVida.personal || '',
            familiar: this.planForm.get('familiar')?.value || f1.proyectoVida.familiar || '',
            social: this.planForm.get('social')?.value || f1.proyectoVida.social || ''
          });
        }
      }
    });
  }

  guardarF3() {
    if (this.planForm.invalid || this.bloqueadoPorFlujo) return;

    this.guardando = true;
    this.guardadoExito = false;

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
        cumplimiento: act.observaciones || '',
        vinculacion_extra: act.vinculacion, // redundancia
        temporalidad_extra: act.temporalidad,
        seguimiento_extra: act.seguimiento
      };
    });

    const payload = {
      expedienteId: this.expedienteId,
      coordinadorId: this.session.getUserId() || null,
      fechaInicioEstimada: this.planForm.get('fechaInicioEstimada')?.value || new Date().toISOString(),
      fechaTerminoEstimada: this.planForm.get('fechaTerminoEstimada')?.value || new Date().toISOString(),
      diasAsignados: this.planForm.get('diasAsignados')?.value?.toString(),
      metasPrograma: this.planForm.get('metasPrograma')?.value,
      observacionesPlan: this.planForm.get('observacionesPlan')?.value,
      proyectoVidaF3: {
        personal: this.planForm.get('personal')?.value,
        familiar: this.planForm.get('familiar')?.value,
        social: this.planForm.get('social')?.value
      },
      actividadesPlan: dictActividades
    };

    if (this.f3Existente && this.f3IdPropio) {
      this.civicoService.actualizarF3(this.f3IdPropio.toString(), payload).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.manejarError(err)
      });
    } else {
      this.civicoService.crearF3(payload).subscribe({
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
  }

  private manejarError(err: any) {
    this.guardando = false;
    this.toast.showError('Error al guardar F3: ' + (err.error?.message || err.message));
    console.error(err);
  }

  /**
   * Generación de PDF oficial desde el backend (F3).
   */
  async generarPDF() {
    if (!this.expedienteId) return;
    this.generandoPDF = true;

    this.toast.showSuccess("Preparando PDF oficial para descarga...");
    this.civicoService.generarDocumentoPDF('f3-plan-trabajo', this.expedienteId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `F3_Plan_Trabajo_${this.datosExpediente?.beneficiario?.nombre || 'Paciente'}.pdf`;
        a.click();
        this.generandoPDF = false;
      },
      error: (err) => {
        this.generandoPDF = false;
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        this.toast.showError(`Aún no se puede realizar esta acción: ${msg}`);
      }
    });
  }

  /**
   * Generación Nativa Frontend Word (.docx)
   */
  async generarWordLocal() {
    this.generandoPDF = true;
    try {
      const formValue = this.planForm.getRawValue();
      const ben = this.datosExpediente?.beneficiario || {};
      const exp = this.datosExpediente || {};
      const f1 = this.datosCompletos?.f1 || {};
      
      const nucleoFamiliarArray: any[] = [];
      if (f1 && f1.nucleoFamiliarPrimario) {
        Object.keys(f1.nucleoFamiliarPrimario).forEach(key => {
          nucleoFamiliarArray.push(f1.nucleoFamiliarPrimario[key]);
        });
      }

      // Convertir Actividades a un diccionario simple para Handlebars
      const acts: any = {};
      this.actividades.value.forEach((act: any) => {
        const nombreSano = act.nombre.replace(/Ó/g, 'O'); // Para PSICOLÓGICA -> PSICOLOGICA
        acts[nombreSano] = act;
      });

      const datosTemplate = {
        nombreBeneficiario: ben.nombre || '—',
        folioExpediente: exp.folioExpediente || '—',
        causaPenal: exp.causaPenal || '—',
        horasSentencia: exp.horasSentencia || '—',
        fechaInicio: formValue.fechaInicioEstimada,
        fechaTermino: formValue.fechaTerminoEstimada,
        metasPrograma: formValue.metasPrograma,
        observaciones: formValue.observacionesPlan,
        actividadesPlan: acts,
        nucleoFamiliar: nucleoFamiliarArray
      };

      await this.wordGenerator.generarDesdePlantilla(
        'f3_plantilla.docx', 
        datosTemplate, 
        `F3_Plan_${ben.nombre || 'Beneficiario'}.docx`
      );
      this.generandoPDF = false;
    } catch (error: any) {
      this.generandoPDF = false;
      alert('Error generando Word local: ' + (error.message || error));
    }
  }
}
