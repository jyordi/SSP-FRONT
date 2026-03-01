import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';
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

  currentSection = 1;
  totalSections = 7;

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

      // SITUACIÓN JURÍDICA
      fechaDetencion: [''],
      faltaCivica: [''],
      relatoHechos: [''],

      // NÚCLEO FAMILIAR
      familiares: this.fb.array([]),
      observacionesFamilia: [''],

      // USO DE SUSTANCIAS
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


      // EMOCIONES
      miedo: [''],
      alegria: [''],
      enojo: [''],
      tristeza: [''],
      amor: [''],

      // PROYECTO DE VIDA
      proyectoPersonal: [''],
      proyectoFamiliar: [''],
      proyectoLaboral: [''],
      proyectoEspiritual: [''],
      proyectoAcademico: [''],
      proyectoSocial: [''],


      destrezas: [''],
deportes: [''],
tiempoLibre: [''],
saludGeneral: [''],
enfermedadCronica: [''],
llevaTratamiento: [''],
detalleTratamiento: [''],
    });

  }

  //FORMARRAY
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

  //  NAVEGACIÓN
  nextSection() {
    if (this.currentSection < this.totalSections) {
      this.currentSection++;
    }
  }

  prevSection() {
    if (this.currentSection > 1) {
      this.currentSection--;
    }
  }

  //  SUBMIT
  onSubmit() {
    if (this.entrevistaForm.valid) {
      console.log(this.entrevistaForm.value);
    } else {
      this.entrevistaForm.markAllAsTouched();
    }
  }

}