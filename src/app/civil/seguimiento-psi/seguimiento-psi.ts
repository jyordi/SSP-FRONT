import { Component, OnInit, inject,} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SessionService } from '../../services/session';
import { Civico } from '../../services/civico';
import { CommonModule, Location } from '@angular/common';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../shared/toast/toast.component';

@Component({
  standalone:true,
  selector: 'app-seguimiento-psi',
  imports: [ ReactiveFormsModule,CommonModule, NavbarReconectaComponent, ToastComponent],
  templateUrl: './seguimiento-psi.html',
  styleUrls: ['./seguimiento-psi.css'],
})
export class SeguimientoPsi {
  
   notaEvolucionForm!: FormGroup;
  expedienteId!: string;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private notaService: Civico,
    private sessionService: SessionService,
    private location: Location,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.expedienteId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.expedienteId) {
      alert("Error: expediente no encontrado");
      return;
    }

    this.initForm();
  }

  initForm() {
    this.notaEvolucionForm = this.fb.group({
      numSesion: [1, Validators.required],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      fechaProximaSesion: [''],
      objetivoSesion: ['', Validators.required],
      conductaDisposicion: ['', Validators.required],
      tema: ['', Validators.required],
      estrategia: [''],
      resumenSesion: ['', Validators.required],
      planTerapeutico: [''],
      actividadesAsignadas: [''],
      observaciones: [''],
      avancePercibido: ['INICIAL', Validators.required],
      esCierre: [false] 
    });
  }

  get f() {
    return this.notaEvolucionForm.controls;
  }

  onSubmit() {
    if (this.notaEvolucionForm.invalid) {
      this.toast.showError("Por favor, completa los campos obligatorios.");
      this.notaEvolucionForm.markAllAsTouched();
      return;
    }
    this.guardarNota();
  }

  guardarNota() {
    if (this.notaEvolucionForm.invalid) {
      this.notaEvolucionForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const form = this.notaEvolucionForm.value;

    //  auto avance si es cierre
    if (form.esCierre) {
      form.avancePercibido = 'EXCELENTE';
    }

    const payload = this.construirPayload(form);

    console.log(" PAYLOAD:", payload);

    this.notaService.crearnota(payload).subscribe({
      next: () => {
        this.loading = false;
        this.toast.showSuccess('Nota de sesión guardada correctamente');
        setTimeout(() => this.location.back(), 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.toast.showError('Error: No se pudo guardar la nota');
      }
    });
  }

  //  payload dinámico
  construirPayload(form: any) {

    const base = {
      expedienteId: this.expedienteId,
      psicologoId: this.sessionService.getUserId(),
      numSesion: form.numSesion,
      fechaSesion: form.fecha,
      horaSesion: form.hora,
      objetivoSesion: form.objetivoSesion,
      conductaDisposicion: form.conductaDisposicion,
      descripcionIntervencion: form.resumenSesion,
      temaSesion: form.tema,
      avancePercibido: form.avancePercibido,
      observaciones: form.observaciones
    };

    if (form.esCierre) {
      return base; //  cierre = menos campos
    }

    return {
      ...base,
      fechaProximaSesion: form.fechaProximaSesion,
      estrategiaAplicada: form.estrategia,
      planTerapeutico: form.planTerapeutico,
      actividadesAsignadasUsuario: form.actividadesAsignadas
    };
  }
}
