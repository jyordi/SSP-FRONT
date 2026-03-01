import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PersonaService } from '../../../services/persona.service';
import jsPDF from 'jspdf'; //se requiere instalar con npm install jspdf

@Component({
  selector: 'app-persona-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './persona-form.html',
  styleUrl: './persona-form.css'
})
export class PersonaForm implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(PersonaService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);

  editando  = false;
  personaId: string | null = null;

  form = this.fb.group({
    folio: [''],

    // I. Generales
    nombre:                  ['', [Validators.required, Validators.minLength(3)]],
    sobrenombre:             [''],
    edad:                    [''],
    fechaNacimiento:         [''],
    curp:                    [''],
    lugarOrigen:             [''],
    motivoIngreso:           [''],
    fechaInicioTratamiento:  [''],
    fechaTerminoTratamiento: [''],
    religion:                [''],
    practicaDeporte:         [''],
    cualDeporte:             [''],
    pasatiempo:              [''],
    tieneActaNacimiento:     [''],
    lugarNacimientoRegistro: [''],
    personasRegistraron:     [''],

    // II. Escolaridad
    sabeLeerEscribir:        [''],
    gradoMaximoEstudios:     [''],
    leGustariaEstudiar:      [''],
    certificadoPrimaria:     [false],
    certificadoSecundaria:   [false],
    certificadoBachillerato: [false],
    nombrePlantel:           [''],
    direccionPlantel:        [''],
    fechaTerminoPlantel:     [''],

    // III. Laboral
    trabajaFormal:             [''],
    funcionesTrabajo:          [''],
    leGustariaCambiarTrabajo:  [''],
    sabeOficio:                [''],
    leGustariaAprenderOficio:  [''],

    // IV. Salud
    padecimientoEnfermedad:       [''],
    servicioSalud:                [''],
    cuentaTratamiento:            [''],
    enfermedadTransmisionSexual:  [''],
    necesitaLentes:               [''],
    atencionPsicologica:          [''],

    // Contactos
    contacto1Nombre:   [''],
    contacto1Relacion: [''],
    contacto1Telefono: [''],
    contacto2Nombre:   [''],
    contacto2Relacion: [''],
    contacto2Telefono: [''],

    estado: ['Activo']
  });

  ngOnInit(): void {
    this.personaId = this.route.snapshot.paramMap.get('id');
    if (this.personaId) {
      this.editando = true;
      const p = this.svc.getById(this.personaId);
      if (p) {
        setTimeout(() => {
          this.form.patchValue(p);
          this.form.updateValueAndValidity();
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  get f() { return this.form.controls; }

  // Getters para condicionales en el template
  get deporteSi()  { return this.f['practicaDeporte'].value === 'Si'; }
  get sinActa()    { return this.f['tieneActaNacimiento'].value === 'No'; }
  get trabajaSi()  { return this.f['trabajaFormal'].value === 'Si'; }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const datos = this.form.value as any;

    if (this.editando && this.personaId) {
      this.svc.update(this.personaId, datos).subscribe({
        next: () => {
          console.log('Persona actualizada');
          this.router.navigate(['/voluntarios/personas']);
        },
        error: (err) => console.error('Error al actualizar:', err)
      });
    } else {
      this.svc.create(datos).subscribe({
        next: () => {
          console.log('Persona creada');
          this.router.navigate(['/voluntarios/personas']);
        },
        error: (err) => console.error('Error al crear:', err)
      });
    }
  }

  descargarPDF(): void {
    const datos = this.form.value;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(123, 29, 58);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RECONECTA CON LA PAZ', 105, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gobierno del Estado de Oaxaca', 105, 16, { align: 'center' });
    doc.text('Centro de Rehabilitación Camino Hacia La Fe', 105, 21, { align: 'center' });

    // Folio
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`FOLIO: ${datos.folio || 'Sin asignar'}`, 15, 35);

    let y = 45;

    const addField = (label: string, value: any, yPos: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || '—'), 70, yPos);
    };

    // I. GENERALES
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('I. GENERALES', 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    addField('Nombre', datos.nombre, y); y += 6;
    addField('Sobrenombre', datos.sobrenombre, y); y += 6;
    addField('Edad', datos.edad, y); y += 6;
    addField('Fecha de nacimiento', datos.fechaNacimiento, y); y += 6;
    addField('CURP', datos.curp, y); y += 6;
    addField('Lugar de origen', datos.lugarOrigen, y); y += 6;
    addField('Motivo de ingreso', datos.motivoIngreso, y); y += 6;
    addField('Fecha inicio tratamiento', datos.fechaInicioTratamiento, y); y += 6;
    addField('Fecha término tratamiento', datos.fechaTerminoTratamiento, y); y += 6;
    addField('Religión', datos.religion, y); y += 6;
    addField('Practica deporte', datos.practicaDeporte, y); y += 6;
    if (datos.practicaDeporte === 'Si') {
      addField('  ¿Cuál deporte?', datos.cualDeporte, y); y += 6;
    }
    addField('Pasatiempo', datos.pasatiempo, y); y += 6;
    addField('Tiene acta de nacimiento', datos.tieneActaNacimiento, y); y += 6;

    if (datos.tieneActaNacimiento === 'No') {
      addField('  Lugar de nacimiento', datos.lugarNacimientoRegistro, y); y += 6;
      addField('  Personas que registraron', datos.personasRegistraron, y); y += 6;
    }

    // II. ESCOLARIDAD
    y += 5;
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('II. ESCOLARIDAD', 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    addField('Sabe leer y escribir', datos.sabeLeerEscribir, y); y += 6;
    addField('Grado máximo de estudios', datos.gradoMaximoEstudios, y); y += 6;
    addField('Le gustaría seguir estudiando', datos.leGustariaEstudiar, y); y += 6;

    const certificados = [];
    if (datos.certificadoPrimaria) certificados.push('Primaria');
    if (datos.certificadoSecundaria) certificados.push('Secundaria');
    if (datos.certificadoBachillerato) certificados.push('Bachillerato');
    addField('Certificados', certificados.length ? certificados.join(', ') : 'Ninguno', y); y += 6;

    addField('Nombre del plantel', datos.nombrePlantel, y); y += 6;
    addField('Dirección del plantel', datos.direccionPlantel, y); y += 6;
    addField('Fecha de término', datos.fechaTerminoPlantel, y); y += 6;

    if (y > 250) { doc.addPage(); y = 20; }

    // III. LABORAL
    y += 5;
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('III. LABORAL', 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    addField('Trabaja formalmente', datos.trabajaFormal, y); y += 6;
    if (datos.trabajaFormal === 'Si') {
      addField('  Funciones', datos.funcionesTrabajo, y); y += 6;
    }
    addField('Le gustaría cambiar de trabajo', datos.leGustariaCambiarTrabajo, y); y += 6;
    addField('Sabe algún oficio', datos.sabeOficio, y); y += 6;
    addField('Le gustaría aprender alguno', datos.leGustariaAprenderOficio, y); y += 6;

    // IV. SALUD
    y += 5;
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('IV. SALUD', 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    addField('Padece alguna enfermedad', datos.padecimientoEnfermedad, y); y += 6;
    addField('Servicio de salud', datos.servicioSalud, y); y += 6;
    addField('Cuenta con tratamiento', datos.cuentaTratamiento, y); y += 6;
    addField('Enfermedad de transmisión sexual', datos.enfermedadTransmisionSexual, y); y += 6;
    addField('Necesita lentes', datos.necesitaLentes, y); y += 6;
    addField('Atención psicológica reciente', datos.atencionPsicologica, y); y += 6;

    // CONTACTOS
    y += 5;
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTACTOS DE REFERENCIA', 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    addField('Contacto 1 - Nombre', datos.contacto1Nombre, y); y += 6;
    addField('Relación', datos.contacto1Relacion, y); y += 6;
    addField('Teléfono', datos.contacto1Telefono, y); y += 8;

    addField('Contacto 2 - Nombre', datos.contacto2Nombre, y); y += 6;
    addField('Relación', datos.contacto2Relacion, y); y += 6;
    addField('Teléfono', datos.contacto2Telefono, y);

    const fileName = `${datos.nombre || 'persona'}_${datos.folio || 'sin-folio'}.pdf`;
    doc.save(fileName);
  }
}
