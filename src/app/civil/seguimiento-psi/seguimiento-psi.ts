import { Component, OnInit, inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-seguimiento-psi',
  imports: [ ReactiveFormsModule],
  templateUrl: './seguimiento-psi.html',
  styleUrl: './seguimiento-psi.css',
})
export class SeguimientoPsi {

  // Declaramos nuestro formulario
  notaEvolucionForm!: FormGroup;
  
  // Inyectamos el FormBuilder de Angular
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.iniciarFormulario();
  }

  iniciarFormulario(): void {
    this.notaEvolucionForm = this.fb.group({
      // =====================
      // 1. Datos del Usuario
      // =====================
      numExpediente: ['', Validators.required],
      nombreUsuario: ['', Validators.required],
      edad: ['', [Validators.required, Validators.min(0)]],
      sexo: ['', Validators.required],

      // =====================
      // 2. Datos de la Sesión
      // =====================
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      numSesion: ['', [Validators.required, Validators.min(1)]],
      fechaProximaSesion: [''], // Opcional, por si no hay próxima cita programada aún

      // =====================
      // 3. Desarrollo de la Sesión
      // =====================
      objetivoSesion: ['', Validators.required],
      conductaDisposicion: ['', Validators.required],
      tema: ['', Validators.required],
      estrategia: ['', Validators.required],
      resumenSesion: ['', Validators.required],

      // =====================
      // 4. Plan y Observaciones
      // =====================
      planTerapeutico: ['', Validators.required],
      actividadesAsignadas: [''], // Opcional
      observaciones: ['']         // Opcional
    });
  }

  // Método que se ejecuta al presionar "Guardar Nota de Evolución"
  onSubmit(): void {
    if (this.notaEvolucionForm.valid) {
      // Aquí el formulario está correcto, listo para enviar a tu API
      console.log('✅ Formulario válido. Datos a guardar:', this.notaEvolucionForm.value);
      
      // Ejemplo: this.http.post('tu-api/notas', this.notaEvolucionForm.value).subscribe(...)
      
    } else {
      // Si falta algún campo obligatorio, marcamos todos como "tocados" 
      // para que se disparen las validaciones visuales si decides agregarlas
      console.warn('❌ Formulario inválido. Revisa los campos requeridos.');
      this.notaEvolucionForm.markAllAsTouched();
    }
  }

}
