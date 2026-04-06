import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PenalService } from '../../services/penal';


@Component({
  selector: 'app-nuevo-expediente-penal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nuevo-expediente-penal.html',
  styleUrls: ['./nuevo-expediente-penal.css']
})
export class NuevoExpedientePenalComponent {

  paso = 1;
  loading = false;
  mensaje = '';
  error = '';

  beneficiarioId!: number;

  beneficiarioForm: FormGroup;
  penalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private penalService: PenalService,
    private router: Router
  ) {

    // 🔥 FORM BENEFICIARIO
    this.beneficiarioForm = this.fb.group({
      nombre: ['', Validators.required],
      curp: ['', Validators.required],
      sexo: ['HOMBRE', Validators.required],
      fechaNacimiento: ['', Validators.required],
      tiempoAsignado: [1, Validators.required],
      unidadTiempo: ['HORAS', Validators.required]
    });

    // 🔥 FORM PENAL
    this.penalForm = this.fb.group({
      cPenal: [''],
      expedienteTecnico: [''],
      folioExpediente: [''],
      juzgado: [''],
      delito: [''],
      agraviado: [''],
      fechaIngresoPrograma: [''],
      fechaSuspensionProceso: [''],
      fechaFinSupervision: [''],
      medidaCautelar: [''],
      observaciones: ['']
    });
  }

  // 🔥 CREAR BENEFICIARIO
  crearBeneficiario() {
    if (this.beneficiarioForm.invalid) {
      this.error = 'Completa todos los campos obligatorios';
      return;
    }

    this.loading = true;
    this.error = '';

    this.penalService.crearBeneficiario(this.beneficiarioForm.value)
      .subscribe({
        next: (res) => {
          this.beneficiarioId = res.id;
          this.loading = false;
          this.paso = 2;
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Error al crear beneficiario';
        }
      });
  }

  // 🔥 CREAR EXPEDIENTE
  crearExpediente() {

    this.loading = true;
    this.mensaje = 'Guardando expediente...';

    const data = {
      ...this.penalForm.value,
      beneficiarioId: this.beneficiarioId
    };

    this.penalService.crearExpediente(data)
      .subscribe({
        next: () => {
          this.mensaje = 'Expediente creado correctamente ✅';

          setTimeout(() => {
            this.router.navigate(['/expedientes']);
          }, 1500);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Error al crear expediente';
        }
      });
  }
}