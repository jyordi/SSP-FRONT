
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';

@Component({
  selector: 'app-nuevo-expediente-civico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nuevo-expediente-civico.html',
  styleUrls: ['./nuevo-expediente-civico.css']
})
export class NuevoExpedienteCivicoComponent implements OnInit {
form!: FormGroup;
  beneficiarioForm!: FormGroup;

  loading = false;
  success = false;

  userName = '';
  role = '';
  token = '';

  step = 1; // 1 = beneficiario, 2 = expediente
  beneficiarioIdCreado = '';

  constructor(
    private fb: FormBuilder,
    private service: Civico,
    private router: Router,
    private session: SessionService
  ) {}

  ngOnInit(): void {  

    this.userName = this.session.getUserName();
    this.role = this.session.getRole();
    this.token = this.session.getToken() || '';

    //  FORM EXPEDIENTE
    this.form = this.fb.group({
      beneficiarioId: ['', Validators.required],
      folioExpediente: ['', Validators.required],
      causaPenal: ['', Validators.required],
      juezCivico: ['', Validators.required],
      fechaInicioSentencia: ['', Validators.required],
      horasSentencia: ['', Validators.required],
      madreNombre: ['', Validators.required],
      madreTelefono: ['', Validators.required]
    });

    //  FORM BENEFICIARIO
    this.beneficiarioForm = this.fb.group({
      nombre: ['', Validators.required],
      tiempoAsignado: ['', Validators.required],
      unidadDeTiempo: ['', Validators.required],
      urlFoto: ['', Validators.required]
    });
  }

  //  1. CREAR BENEFICIARIO
  crearBeneficiario() {

    if (this.beneficiarioForm.invalid) {
      this.beneficiarioForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const data = {
      nombre: this.beneficiarioForm.value.nombre,
      tiempoAsignado: Number(this.beneficiarioForm.value.tiempoAsignado),
      unidadDeTiempo: this.beneficiarioForm.value.unidadDeTiempo,
      urlFoto: this.beneficiarioForm.value.urlFoto
    };

    this.service.crearBeneficiario(data).subscribe({

      next: (res) => {
        console.log('Beneficiario creado:', res);

        this.loading = false;

        // 🔥 AJUSTA ESTO SI TU BACK DEVUELVE OTRO NOMBRE
        this.beneficiarioIdCreado = res.id;

        // 🔥 PASAMOS EL ID AL FORM DE EXPEDIENTE
        this.form.patchValue({
          beneficiarioId: this.beneficiarioIdCreado
        });

        // 🔥 CAMBIAMOS A SIGUIENTE PASO
        this.step = 2;
      },

      error: (err) => {
        console.error(err);
        this.loading = false;
        alert('Error al crear beneficiario');
      }
    });
  }

  // 🔥 2. CREAR EXPEDIENTE
  submit() {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const data = {
      beneficiarioId: this.form.value.beneficiarioId,
      folioExpediente: this.form.value.folioExpediente,
      causaPenal: this.form.value.causaPenal,
      juezCivico: this.form.value.juezCivico,
      fechaInicioSentencia: this.form.value.fechaInicioSentencia,
      horasSentencia: Number(this.form.value.horasSentencia),
      contactosFamiliares: {
        madre: {
          nombre: this.form.value.madreNombre,
          telefono: this.form.value.madreTelefono
        }
      },
      rol: this.role,
      token: this.token
    };

    this.service.crearCivico(data, this.token).subscribe({

      next: () => {
        this.loading = false;
        this.success = true;

        setTimeout(() => {
          this.router.navigate(['/expedientes']);
        }, 2000);
      },

      error: (err) => {
        console.error(err);
        this.loading = false;
        alert('Error al crear expediente');
      }
    });
  }

  
}

