import { Component, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-formu-psico',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './formu-psico.html',
  styleUrls: ['./formu-psico.css'],
  encapsulation: ViewEncapsulation.None
})
export class FormuPsico {

  entrevistaForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.entrevistaForm = this.fb.group({

      // 1️⃣ GENERALES
      nombre: ['', Validators.required],
      edad: ['', Validators.required],
      sobrenombre: [''],
      fechaNacimiento: [''],
      curp: [''],
      originario: [''],
      telefono: [''],
      escolaridad: [''],
      estadoCivil: [''],
      nacionalidad: [''],
      lenguaIndigena: [''],
      religion: [''],
      ocupacion: [''],
      domicilio: [''],

      // 2️⃣ SITUACIÓN JURÍDICA
      fechaDetencion: [''],
      faltaCivica: [''],
      relatoHechos: [''],

      // 3️⃣ NÚCLEO FAMILIAR
      familiares: this.fb.array([]),
      observacionesFamilia: [''],

      // 4️⃣ USO DE SUSTANCIAS
      consumeAlcohol: [''],
      especificaConsumo: [''],
      haRecibidoTerapias: [''],
      necesitaApoyoPsicologico: [''],
      acudeSesionesGrupos: [''],
      especificadonde: [''],
      haEstadoRehabilitacion: [''],
      especificaencual: [''],
      perteneceGrupoCultural: [''],
      especifiquegrupo: [''],

      // 5️⃣ EMOCIONES
      miedo: [''],
      alegria: [''],
      enojo: [''],
      tristeza: [''],
      amor: [''],

      // 6️⃣ DESTREZAS Y SALUD
      destrezas: [''],
      deportes: [''],
      tiempoLibre: [''],
      saludGeneral: [''],
      enfermedadCronica: [''],
      llevaTratamiento: [''],
      detalleTratamiento: [''],

      // 7️⃣ PROYECTO DE VIDA
      proyectoPersonal: [''],
      proyectoFamiliar: [''],
      proyectoLaboral: [''],
      proyectoEspiritual: [''],
      proyectoAcademico: [''],
      proyectoSocial: ['']
    });
  }

  // =====================
  // MANEJO DEL FORMARRAY (Familiares)
  // =====================
  get familiares(): FormArray {
    return this.entrevistaForm.get('familiares') as FormArray;
  }

  addFamiliar() {
    this.familiares.push(
      this.fb.group({
        nombre: [''],
        parentesco: [''],
        edad: [''],
        estadoCivil: [''],
        escolaridad: [''],
        ocupacion: ['']
      })
    );
  }

  removeFamiliar(index: number) {
    this.familiares.removeAt(index);
  }

  // =====================
  // SUBMIT
  // =====================
  onSubmit() {
    if (this.entrevistaForm.valid) {
      console.log('✅ Formulario válido y listo para enviar:', this.entrevistaForm.value);
    } else {
      console.warn('❌ Faltan campos requeridos.');
      this.entrevistaForm.markAllAsTouched();
    }
  }

}