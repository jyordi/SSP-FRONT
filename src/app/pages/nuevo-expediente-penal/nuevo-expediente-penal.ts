import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-nuevo-expediente-penal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './nuevo-expediente-penal.html',
  styleUrls: ['./nuevo-expediente-penal.css']
})
export class NuevoExpedientePenalComponent implements OnInit {

  paso = 1;
  loading = false;
  
  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;

  beneficiarioId!: number;

  previewUrl: string | null = null;
  fotoBase64: string | null = null;

  beneficiarioForm: FormGroup;
  penalForm: FormGroup;

  role: string = '';

  constructor(
    private fb: FormBuilder,
    private penalService: PenalService,
    private session: SessionService,
    private router: Router
  ) {

    // Solo pide lo que el back de beneficiarios espera
    this.beneficiarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tiempoAsignado: [6, [Validators.required, Validators.min(1)]],
      unidadTiempo: ['MESES', Validators.required],
      urlFoto: ['']
    });

    // Pide estrictamente lo del JSON de expediente penal
    this.penalForm = this.fb.group({
      cPenal: ['', Validators.required],
      expedienteTecnico: ['', Validators.required],
      folioIncorporacion: ['', Validators.required],
      juzgado: ['', Validators.required],
      delito: ['', Validators.required],
      agraviado: [''],
      fechaIngresoPrograma: ['', Validators.required],
      fechaSuspensionProceso: [''],
      fechaFinSupervision: ['', Validators.required],
      medidaCautelar: ['', Validators.required],
      observaciones: ['']
    });
  }

  ngOnInit() {
    this.role = this.session.getRole();
    if (this.role !== 'admin') {
      this.router.navigate(['/expedientes']);
    }
  }

  // 📸 COMPRESIÓN DE IMAGEN
  onFileChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.mostrarToast('Solo se permiten imágenes (jpg, png)', 'error');
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
      this.beneficiarioForm.markAllAsTouched();
      this.mostrarToast('Por favor completa los campos del beneficiario', 'error');
      return;
    }

    this.loading = true;

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
          this.mostrarToast('Beneficiario registrado. Continúa con el expediente.', 'ok');
        },
        error: (err) => {
          this.loading = false;
          this.mostrarToast(err.error?.message || 'Error al crear beneficiario', 'error');
        }
      });
  }

  crearExpediente() {
    if (this.penalForm.invalid) {
       this.penalForm.markAllAsTouched();
       this.mostrarToast('Revisa los campos obligatorios del expediente', 'error');
       return;
    }

    // Validación de fechas
    const fi = new Date(this.penalForm.value.fechaIngresoPrograma);
    const ff = new Date(this.penalForm.value.fechaFinSupervision);
    if (ff < fi) {
       this.mostrarToast('La fecha de fin no puede ser menor a la de ingreso', 'error');
       return;
    }

    this.loading = true;

    const data = {
      ...this.penalForm.value,
      beneficiarioId: this.beneficiarioId
    };

    this.penalService.crearExpediente(data)
      .subscribe({
        next: () => {
          this.loading = false;
          this.mostrarToast('✅ Expediente creado correctamente', 'ok');

          setTimeout(() => {
            this.router.navigate(['/expedientes']);
          }, 2000);
        },
        error: (err) => {
          this.loading = false;
          this.mostrarToast(err.error?.message || 'Error al crear expediente', 'error');
        }
      });
  }

  regresarPaso1() {
    this.paso = 1;
  }

  regresar() {
    if(confirm('¿Seguro que deseas salir? Los datos no guardados se perderán.')) {
      this.router.navigate(['/expedientes']);
    }
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }
}