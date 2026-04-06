export interface Persona {
  id?: string;
  folio: string;

  // I. Generales
  nombre: string;
  sobrenombre: string;
  edad: string;
  fechaNacimiento: string;
  curp: string;
  lugarOrigen: string;
  motivoIngreso: string;
  fechaInicioTratamiento: string;
  fechaTerminoTratamiento: string;
  religion: string;
  practicaDeporte: string;
  cualDeporte: string;
  pasatiempo: string;
  tieneActaNacimiento: string;
  lugarNacimientoRegistro: string;
  personasRegistraron: string;

  // II. Escolaridad
  sabeLeerEscribir: string;
  gradoMaximoEstudios: string;
  leGustariaEstudiar: string;
  certificadoPrimaria: boolean;
  certificadoSecundaria: boolean;
  certificadoBachillerato: boolean;
  nombrePlantel: string;
  direccionPlantel: string;
  fechaTerminoPlantel: string;

  // III. Laboral
  trabajaFormal: string;
  funcionesTrabajo: string;
  leGustariaCambiarTrabajo: string;
  sabeOficio: string;
  leGustariaAprenderOficio: string;

  // IV. Salud
  padecimientoEnfermedad: string;
  servicioSalud: string;
  cuentaTratamiento: string;
  enfermedadTransmisionSexual: string;
  necesitaLentes: string;
  atencionPsicologica: string;

  // Contactos
  contacto1Nombre: string;
  contacto1Relacion: string;
  contacto1Telefono: string;
  contacto2Nombre: string;
  contacto2Relacion: string;
  contacto2Telefono: string;

  estado: 'Activo' | 'Inactivo';
}
