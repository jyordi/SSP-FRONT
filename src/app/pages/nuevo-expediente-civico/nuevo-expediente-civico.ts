
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
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
  loading = false;
  success = false;

  userName = '';
  role = '';
  token = '';

  constructor(
    private fb: FormBuilder,
    private service: ExpedientesService,
    private router: Router,
    private session: SessionService
  ) {}

  ngOnInit(): void {

    // 🔥 usuario, rol y token
    this.userName = this.session.getUserName();
    this.role = this.session.getRole();
    this.token = this.session.getToken() || '';

    // 🔥 form
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
  }

  submit() {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Rol:', this.role);
    console.log('Token:', this.token);

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

    this.service.crearCivico(data).subscribe({
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

        alert('Error 403: No tienes permisos (usa admin)');
      }
    });
  }
}

