import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PersonaService } from '../../../services/persona.service';
import jsPDF from 'jspdf';
import { Location } from '@angular/common';

@Component({
  selector: 'app-persona-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './persona-form.html',
  styleUrl: './persona-form.css'
})
export class PersonaForm implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(PersonaService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private cdr    = inject(ChangeDetectorRef);
  private location = inject(Location);

  editando  = false;
  personaId: string | null = null;
   errores: string[] = [];

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

  this.errores = [];
  const datos = this.form.value as any;

  if (this.editando && this.personaId) {
    this.svc.update(this.personaId, datos).subscribe({
      next: () => {
        console.log('Persona actualizada');
        this.router.navigate(['/voluntarios/personas']);
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        console.log('err.error:', err.error); // 🔍 Para ver qué viene
        console.log('err.error.message:', err.error.message); // 🔍 Para ver el mensaje

        if (err.status === 400) {
          this.errores = this.procesarErrores(err.error.message);
        } else {
          this.errores = ['Ocurrió un error inesperado. Intente de nuevo.'];
        }
      }
    });
  } else {
    this.svc.create(datos).subscribe({
      next: () => {
        console.log('Persona creada');
        this.router.navigate(['/voluntarios/personas']);
      },
      error: (err) => {
        console.error('Error al crear:', err);
        console.log('err.error:', err.error); // 🔍 Para ver qué viene
        console.log('err.error.message:', err.error.message); // 🔍 Para ver el mensaje

        if (err.status === 400) {
          this.errores = this.procesarErrores(err.error.message);
        } else {
          this.errores = ['Ocurrió un error inesperado. Intente de nuevo.'];
        }
      }
    });
  }
}

 descargarPDF(): void {
  const datos = this.form.value;
  const doc = new jsPDF();

  let y = 0;
  const margenInferior = 280; // Límite antes de crear nueva página
  const altoLinea = 6;

  // Función para verificar si necesitamos nueva página
  const verificarNuevaPagina = (espacioNecesario: number = altoLinea) => {
    if (y + espacioNecesario > margenInferior) {
      doc.addPage();
      y = 20; // Margen superior en nueva página
    }
  };

  // Función para agregar campo
  const addField = (label: string, value: any) => {
    verificarNuevaPagina(altoLinea);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—'), 70, y);
    y += altoLinea;
  };

  // Función para agregar sección
  const addSection = (titulo: string) => {
    verificarNuevaPagina(12); // Espacio para el header de sección
    doc.setFillColor(123, 29, 58);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 18, y + 5);

    y += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
  };

  // ========== HEADER ==========
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
  y = 35;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`FOLIO: ${datos.folio || 'Sin asignar'}`, 15, y);

  y = 45;
  doc.setFontSize(9);

  // ========== I. GENERALES ==========
  addSection('I. GENERALES');

  addField('Nombre', datos.nombre);
  addField('Sobrenombre', datos.sobrenombre);
  addField('Edad', datos.edad);
  addField('Fecha de nacimiento', datos.fechaNacimiento);
  addField('CURP', datos.curp);
  addField('Lugar de origen', datos.lugarOrigen);
  addField('Motivo de ingreso', datos.motivoIngreso);
  addField('Fecha inicio tratamiento', datos.fechaInicioTratamiento);
  addField('Fecha término tratamiento', datos.fechaTerminoTratamiento);
  addField('Religión', datos.religion);
  addField('Practica deporte', datos.practicaDeporte);

  if (datos.practicaDeporte === 'Si') {
    addField('  ¿Cuál deporte?', datos.cualDeporte);
  }

  addField('Pasatiempo', datos.pasatiempo);
  addField('Tiene acta de nacimiento', datos.tieneActaNacimiento);

  if (datos.tieneActaNacimiento === 'No') {
    addField('  Lugar de nacimiento', datos.lugarNacimientoRegistro);
    addField('  Personas que registraron', datos.personasRegistraron);
  }

  // ========== II. ESCOLARIDAD ==========
  y += 5;
  addSection('II. ESCOLARIDAD');

  addField('Sabe leer y escribir', datos.sabeLeerEscribir);
  addField('Grado máximo de estudios', datos.gradoMaximoEstudios);
  addField('Le gustaría seguir estudiando', datos.leGustariaEstudiar);

  const certificados = [];
  if (datos.certificadoPrimaria) certificados.push('Primaria');
  if (datos.certificadoSecundaria) certificados.push('Secundaria');
  if (datos.certificadoBachillerato) certificados.push('Bachillerato');
  addField('Certificados', certificados.length ? certificados.join(', ') : 'Ninguno');

  addField('Nombre del plantel', datos.nombrePlantel);
  addField('Dirección del plantel', datos.direccionPlantel);
  addField('Fecha de término', datos.fechaTerminoPlantel);

  // ========== III. LABORAL ==========
  y += 5;
  addSection('III. LABORAL');

  addField('Trabaja formalmente', datos.trabajaFormal);

  if (datos.trabajaFormal === 'Si') {
    addField('  Funciones', datos.funcionesTrabajo);
  }

  addField('Le gustaría cambiar de trabajo', datos.leGustariaCambiarTrabajo);
  addField('Sabe algún oficio', datos.sabeOficio);
  addField('Le gustaría aprender alguno', datos.leGustariaAprenderOficio);

  // ========== IV. SALUD ==========
  y += 5;
  addSection('IV. SALUD');

  addField('Padece alguna enfermedad', datos.padecimientoEnfermedad);
  addField('Servicio de salud', datos.servicioSalud);
  addField('Cuenta con tratamiento', datos.cuentaTratamiento);
  addField('Enfermedad de transmisión sexual', datos.enfermedadTransmisionSexual);
  addField('Necesita lentes', datos.necesitaLentes);
  addField('Atención psicológica reciente', datos.atencionPsicologica);

  // ========== CONTACTOS ==========
  y += 5;
  addSection('CONTACTOS DE REFERENCIA');

  addField('Contacto 1 - Nombre', datos.contacto1Nombre);
  addField('Relación', datos.contacto1Relacion);
  addField('Teléfono', datos.contacto1Telefono);

  y += 2; // Espacio extra entre contactos

  addField('Contacto 2 - Nombre', datos.contacto2Nombre);
  addField('Relación', datos.contacto2Relacion);
  addField('Teléfono', datos.contacto2Telefono);

  // ========== GUARDAR ==========
  const fileName = `${datos.nombre || 'persona'}_${datos.folio || 'sin-folio'}.pdf`;
  doc.save(fileName);
}

 private procesarErrores(mensaje: any): string[] {
  // Si es un array, procesarlo como tal
  if (Array.isArray(mensaje)) {
    return mensaje.map(m => this.traducirError(String(m)));
  }

  // Si es un objeto, convertirlo a string
  if (typeof mensaje === 'object' && mensaje !== null) {
    mensaje = JSON.stringify(mensaje);
  }

  // Convertir a string por si acaso
  const mensajeStr = String(mensaje);

  // Si el mensaje contiene comas, dividirlo
  const mensajes = mensajeStr.includes(',')
    ? mensajeStr.split(',').map(m => m.trim())
    : [mensajeStr];

  return mensajes.map(msg => this.traducirError(msg));
}

private traducirError(error: any): string {
  const errorStr = String(error);

  const traducciones: { [key: string]: string } = {
    // Validaciones generales
    'must be a valid ISO 8601 date string': 'debe tener formato de fecha válido (Ej: 2024-12-31)',
    'must be shorter than or equal to': 'debe tener máximo',
    'must be longer than or equal to': 'debe tener mínimo',
    'must be a string': 'debe ser texto',
    'must be a number': 'debe ser un número',
    'must be an integer': 'debe ser un número entero',
    'must be a boolean': 'debe ser verdadero o falso',
    'should not be empty': 'no puede estar vacío',
    'must be a valid email': 'debe ser un correo electrónico válido',
    'must be a valid date': 'debe tener formato de fecha válido',

    // Campos específicos (con sus variaciones)
    'fechaNacimiento': 'Fecha de nacimiento',
    'Fecha de nacimiento': 'Fecha de nacimiento',
    'fechaInicioTratamiento': 'Fecha de inicio del tratamiento',
    'fechaTerminoTratamiento': 'Fecha de término del tratamiento',
    'FechaTerminoTratamiento': 'Fecha de término del tratamiento',
    'fechaTerminoPlantel': 'Fecha de término del plantel',
    'FechaTerminoPlantel': 'Fecha de término del plantel',
    'nombre': 'Nombre',
    'edad': 'Edad',
    'folio': 'Folio',
    'curp': 'CURP',
    'email': 'Correo electrónico',
    'sobrenombre': 'Sobrenombre',
    'lugarOrigen': 'Lugar de origen',
    'motivoIngreso': 'Motivo de ingreso',
    'religion': 'Religión',
    'practicaDeporte': 'Practica deporte',
    'cualDeporte': 'Cuál deporte',
    'pasatiempo': 'Pasatiempo',
    'tieneActaNacimiento': 'Tiene acta de nacimiento',
    'lugarNacimientoRegistro': 'Lugar de nacimiento en registro',
    'personasRegistraron': 'Personas que registraron',
    'sabeLeerEscribir': 'Sabe leer y escribir',
    'gradoMaximoEstudios': 'Grado máximo de estudios',
    'leGustariaEstudiar': 'Le gustaría estudiar',
    'certificadoPrimaria': 'Certificado de primaria',
    'certificadoSecundaria': 'Certificado de secundaria',
    'certificadoBachillerato': 'Certificado de bachillerato',
    'nombrePlantel': 'Nombre del plantel',
    'direccionPlantel': 'Dirección del plantel',
    'trabajaFormal': 'Trabaja formalmente',
    'funcionesTrabajo': 'Funciones en el trabajo',
    'leGustariaCambiarTrabajo': 'Le gustaría cambiar de trabajo',
    'sabeOficio': 'Sabe algún oficio',
    'leGustariaAprenderOficio': 'Le gustaría aprender un oficio',
    'padecimientoEnfermedad': 'Padece alguna enfermedad',
    'servicioSalud': 'Servicio de salud',
    'cuentaTratamiento': 'Cuenta con tratamiento',
    'enfermedadTransmisionSexual': 'Enfermedad de transmisión sexual',
    'necesitaLentes': 'Necesita lentes',
    'atencionPsicologica': 'Atención psicológica',
    'contacto1Nombre': 'Nombre del contacto 1',
    'contacto1Relacion': 'Relación del contacto 1',
    'contacto1Telefono': 'Teléfono del contacto 1',
    'contacto2Nombre': 'Nombre del contacto 2',
    'contacto2Relacion': 'Relación del contacto 2',
    'contacto2Telefono': 'Teléfono del contacto 2',

    // Palabras comunes
    'characters': 'caracteres',
    'character': 'caracter'
  };

  let traducido = errorStr;

  // Reemplazar cada patrón encontrado
  Object.entries(traducciones).forEach(([en, es]) => {
    traducido = traducido.replace(new RegExp(en, 'gi'), es);
  });

  // Capitalizar la primera letra
  return traducido.charAt(0).toUpperCase() + traducido.slice(1);
}
volver() {
  this.location.back();
}
}
