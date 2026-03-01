import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActividadService } from '../../../services/actividad.service';

@Component({
  selector: 'app-actividad-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './actividad-form.html',
  styleUrl: './actividad-form.css'
})
export class ActividadForm implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(ActividadService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);

  editando    = false;
  actividadId: string | null = null;

  form = this.fb.group({
    nombreActividad:  ['', Validators.required],
    impartidor:       ['', Validators.required],
    responsable:      ['', Validators.required],
    lugar:            ['', Validators.required],
    fecha:            [new Date().toISOString().slice(0, 10), Validators.required],
    numParticipantes: [1, [Validators.required, Validators.min(1)]],
    estado:           ['Se llevó a cabo'],
    descripcion:      ['']
  });

  ngOnInit(): void {
    this.actividadId = this.route.snapshot.paramMap.get('id');
    if (this.actividadId) {
      this.editando = true;
      const a = this.svc.getById(this.actividadId);
      if (a) {
        setTimeout(() => {
          this.form.patchValue(a);
          this.form.updateValueAndValidity();
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  get f() { return this.form.controls; }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const datos = this.form.value as any;

    if (this.editando && this.actividadId) {
      this.svc.update(this.actividadId, datos).subscribe({
        next: () => {
          console.log('Actividad actualizada');
          this.router.navigate(['/voluntarios/actividades']);
        },
        error: (err) => console.error('Error al actualizar:', err)
      });
    } else {
      this.svc.create(datos).subscribe({
        next: () => {
          console.log('Actividad creada');
          this.router.navigate(['/voluntarios/actividades']);
        },
        error: (err) => console.error('Error al crear:', err)
      });
    }
  }
}
