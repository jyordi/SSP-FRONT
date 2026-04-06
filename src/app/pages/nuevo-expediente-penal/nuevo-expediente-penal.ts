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

  previewUrl: string | null = null;
  fotoBase64: string | null = null;

  beneficiarioForm: FormGroup;
  penalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private penalService: PenalService,
    private router: Router
  ) {

    this.beneficiarioForm = this.fb.group({
      nombre: ['', Validators.required],
      curp: ['', Validators.required],
      sexo: ['HOMBRE', Validators.required],
      fechaNacimiento: ['', Validators.required],
      tiempoAsignado: [1, Validators.required],
      unidadTiempo: ['HORAS', Validators.required],
      urlFoto: ['']
    });

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

  // 📸 COMPRESIÓN DE IMAGEN (SOLUCIÓN 413)
  onFileChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error = 'Solo se permiten imágenes';
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {

        const canvas = document.createElement('canvas');

        const MAX_WIDTH = 300;
        const scale = MAX_WIDTH / img.width;

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 🔥 COMPRIMIR
        const compressed = canvas.toDataURL('image/jpeg', 0.5);

        this.previewUrl = compressed;
        this.fotoBase64 = compressed;

        this.beneficiarioForm.patchValue({
          urlFoto: compressed
        });
      };
    };

    reader.readAsDataURL(file);
  }

  crearBeneficiario() {

    if (this.beneficiarioForm.invalid) {
      this.error = 'Completa los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    const data = {
      ...this.beneficiarioForm.value,
      nombre: this.beneficiarioForm.value.nombre.toUpperCase()
    };

    this.penalService.crearBeneficiario(data)
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