import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Civico } from '../../services/civico';

@Component({
  selector: 'app-plan-vida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-vida.html',
  styleUrl: './plan-vida.css'
})
export class PlanVidaComponent implements OnInit {
  @Input() expediente: any;

  planForm!: FormGroup;
  cargando = true;
  guardando = false;
  generandoPDF = false;
  f1Id: string | null = null;
  sinF1 = false;

  constructor(
    private fb: FormBuilder,
    private civico: Civico,
    private cdr: ChangeDetectorRef
  ) {
    this.planForm = this.fb.group({
      personal: ['', Validators.required],
      familiar: ['', Validators.required],
      laboral: ['', Validators.required],
      espiritual: ['', Validators.required],
      academico: ['', Validators.required],
      social: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    this.civico.obtenerF1PorExpediente(expId).subscribe({
      next: (f1: any) => {
        if (!f1 || !f1.idUUID) {
          this.sinF1 = true;
        } else {
          this.f1Id = f1.idUUID;
          if (f1.proyectoVida) {
            this.planForm.patchValue({
              personal: f1.proyectoVida.personal || '',
              familiar: f1.proyectoVida.familiar || '',
              laboral: f1.proyectoVida.laboral || '',
              espiritual: f1.proyectoVida.espiritual || '',
              academico: f1.proyectoVida.academico || '',
              social: f1.proyectoVida.social || ''
            });
          }
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sinF1 = true;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardarPlan() {
    if (!this.f1Id) {
      alert("No se puede guardar porque no existe la Entrevista Clínica (F1). Cree primero la Entrevista.");
      return;
    }

    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    this.guardando = true;

    // Actualizamos ÚNICAMENTE el bloque proyectoVida usando el PATCH
    const payload = {
      proyectoVida: this.planForm.value
    };

    this.civico.actualizarF1(this.f1Id, payload).subscribe({
      next: () => {
        this.guardando = false;
        alert('Plan de Vida guardado correctamente.');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.guardando = false;
        const msg = err.error?.message || err.message;
        alert(`Error al guardar: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
        this.cdr.detectChanges();
      }
    });
  }

  descargarPlanPDF() {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    this.generandoPDF = true;
    this.civico.generarDocumentoPDF('plan-vida', expId).subscribe({
      next: (blob: Blob) => {
        this.generandoPDF = false;
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `Plan_Vida_${this.expediente.beneficiario?.nombre || 'Beneficiario'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.generandoPDF = false;
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
        this.cdr.detectChanges();
      }
    });
  }
}
