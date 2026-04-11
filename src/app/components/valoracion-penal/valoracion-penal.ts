import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-valoracion-penal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './valoracion-penal.html',
  styleUrls: ['./valoracion-penal.css']
})
export class ValoracionPenalComponent implements OnInit {
  
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly penalService = inject(PenalService);
  private readonly session = inject(SessionService);

  form!: FormGroup;
  loading = false;
  modoEdicion = false;
  valoracionExistenteId: number | null = null;

  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;
  expediente: any = null;

  // Variables calculadas
  nombreBeneficiario = 'Sin beneficiario';
  numeroExpediente = 'S/N';
  
  ngOnInit(): void {
    // 🛡️ Protección de rol
    const role = this.session.getRole();
    if (role !== 'admin' && role !== 'psicologo') {
      this.router.navigate(['/expedientes']);
      return;
    }

    this._buildForm();
    this._recuperarExpediente();
  }

  private _buildForm(): void {
    // 100% alineado al backend:
    this.form = this.fb.group({
      expedienteId: [null, Validators.required],
      psicologoId: [null, Validators.required],
      // Fecha en formato yyyy-MM-dd
      fechaEstudio: [new Date().toISOString().substring(0, 10), Validators.required],
      motivoValoracion: [''],

      // Agrupamos el JSONB
      seccionesJsonb: this.fb.group({
        metodologia: [''],
        datos_generales: this.fb.group({
          escolaridad: [''],
          ocupacion: ['']
        }),
        apariencia: [''],
        actitud_entrevista: [''],
        examen_mental: this.fb.group({
          orientacion: [''],
          memoria: ['']
        })
      }),

      observacionesGenerales: [''],
      
      // Resultados y Accion
      resultadosPruebas: this.fb.group({
        test_1: ['']
      }),
      accionDerivada: this.fb.group({
        canalizacion: ['']
      })
    });

    // Rellenamos el psicologoId basado en la sesión (el usuario autenticado)
    // El id del rol autenticado se llamará del token/sesion:
    const userId = this.session.getUserId();
    if (userId) {
      this.form.patchValue({ psicologoId: Number(userId) });
    }
  }

  private _recuperarExpediente(): void {
    const raw = sessionStorage.getItem('expediente');
    if (raw) {
      try {
        this.expediente = JSON.parse(raw);
        this.numeroExpediente = this.expediente.cPenal || this.expediente.numeroExpediente || String(this.expediente.id);
        
        // Auto-llenar
        const beneficiarioId = this.expediente.beneficiario?.id || this.expediente.beneficiarioId;
        this.form.patchValue({
          expedienteId: this.expediente.id
        });

        if (beneficiarioId) {
          // Consultar beneficiario completo para traer escolaridad/ocupacion original
          this.penalService.getBeneficiario(beneficiarioId).subscribe({
            next: (res: any) => {
              const ben = res?.beneficiario || res;
              if (ben) {
                this.nombreBeneficiario = ben.nombre;
                
                // Rellenar datos_generales en la sección profunda
                this.form.patchValue({
                  seccionesJsonb: {
                    datos_generales: {
                      escolaridad: ben.escolaridad || ben.nivel_escolaridad || '',
                      ocupacion: ben.ocupacion || ben.ocupacion_actual || ''
                    }
                  }
                });
              }
            }
          });
        }

        // 🔎 Buscar si ya existe una valoración psicológica para este expediente
        this.penalService.getValoracionByExpediente(this.expediente.id).subscribe({
          next: (val: any) => {
            if (val && val.id) {
              this.modoEdicion = true;
              this.valoracionExistenteId = val.id;
              
              // Rellenar el formulario con la valoración existentente
              this.form.patchValue({
                fechaEstudio: val.fechaEstudio ? val.fechaEstudio.substring(0, 10) : '',
                motivoValoracion: val.motivoValoracion || '',
                seccionesJsonb: val.seccionesJsonb || {},
                observacionesGenerales: val.observacionesGenerales || '',
                resultadosPruebas: val.resultadosPruebas || {},
                accionDerivada: val.accionDerivada || {}
              });
              this.mostrarToast('Valoración existente cargada', 'ok');
            }
          },
          error: (err) => {
            // Si devuelve 404, significa que es nueva (no existe). No hacemos nada.
            console.log('No hay valoración previa, ingresando en modo Creación');
          }
        });

      } catch (e) {
        console.error('Error parseando expediente', e);
      }
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarToast('Faltan campos obligatorios', 'error');
      return;
    }

    this.loading = true;
    const dto = this.form.value;

    const request$ = this.modoEdicion && this.valoracionExistenteId
      ? this.penalService.updateValoracion(this.valoracionExistenteId, dto)
      : this.penalService.saveValoracionPsicologica(dto);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.mostrarToast(this.modoEdicion ? '✅ Valoración actualizada con éxito' : '✅ Valoración guardada con éxito', 'ok');
        setTimeout(() => {
          if (this.expediente && this.expediente.id) {
            this.router.navigate(['/detalle-penal', this.expediente.id]);
          } else {
            this.router.navigate(['/expedientes']);
          }
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        const eMsg = err.error?.message || 'Hubo un error al guardar';
        this.mostrarToast(eMsg, 'error');
      }
    });
  }


  regresar(): void {
    if (this.expediente && this.expediente.id) {
      this.router.navigate(['/detalle-penal', this.expediente.id]);
    } else {
      this.router.navigate(['/expedientes']);
    }
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }
}