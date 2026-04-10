import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { jsPDF } from 'jspdf';

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
    private session: SessionService
  ) {}

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

  private crearFilaActividad(nombre: string, estatus = '', objetivo = '', cumplimiento = ''): FormGroup {
    return this.fb.group({
      nombre: [nombre],
      estatus: [estatus],
      objetivo: [objetivo],
      cumplimiento: [cumplimiento]
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
            observacionesPlan: res.observacionesPlan || ''
          });

          // Reconstruir form arrays con el diccionario actividadesPlan
          if (res.actividadesPlan && typeof res.actividadesPlan === 'object') {
            this.actividades.clear();
            const keys = Object.keys(res.actividadesPlan);
            
            if (keys.length > 0) {
              keys.forEach(key => {
                const act = res.actividadesPlan[key];
                this.actividades.push(this.crearFilaActividad(
                  key,
                  act.estatus,
                  act.objetivo,
                  act.cumplimiento
                ));
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
        if (this.modoSoloLectura) {
           this.planForm.disable();
        } else {
           // ES CREACIÓN, Verificar dependencias previas (CANDADO F3)
           this.civicoService.verificarCandadoF3(this.expedienteId).subscribe({
             next: () => {
               this.bloqueadoPorFlujo = false;
             },
             error: (err) => {
               this.bloqueadoPorFlujo = true;
               let msg = err.error?.message || 'Documentos previos';
               if (Array.isArray(msg)) msg = msg.join(', ');
               this.mensajeBloqueo = `Aún no se puede realizar esta acción, falta completar: ${msg}`;
               this.planForm.disable();
             }
           });
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

  guardarF3() {
    if (this.planForm.invalid) return;

    this.guardando = true;
    this.guardadoExito = false;

    const dictActividades: any = {};
    this.actividades.value.forEach((act: any) => {
      dictActividades[act.nombre] = {
        estatus: act.estatus || 'PENDIENTE',
        objetivo: act.objetivo || '',
        cumplimiento: act.cumplimiento || '',
        vinculacion: '',
        temporalidad: '',
        seguimiento: ''
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
    this.guardadoExito = true;
    setTimeout(() => this.guardadoExito = false, 3000);
  }

  private manejarError(err: any) {
    this.guardando = false;
    alert('Error del Servidor: \n' + (err.error?.message || err.message));
    console.error(err);
  }

  /**
   * Generación de PDF oficial desde el backend (F3).
   */
  async generarPDF() {
    if (!this.expedienteId) return;
    this.generandoPDF = true;

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
        alert(`Aún no se puede realizar esta acción: ${msg}`);
      }
    });
  }
}
