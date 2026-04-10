import { Component, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Civico } from '../../services/civico';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-formu-psico',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './formu-psico.html',
  styleUrls: ['./formu-psico.css'],
  encapsulation: ViewEncapsulation.Emulated
})
export class FormuPsico {

  @Input() expedienteId: string = '';
  @Input() datosF1: any = null;     // Los datos si ya existe la entrevista
  @Input() datosAdmin: any = null;  // Los datos que llenó el admin
  @Output() entrevistaGuardada = new EventEmitter<any>();

  entrevistaForm: FormGroup;

  constructor(private fb: FormBuilder, private civicoService: Civico) {

    this.entrevistaForm = this.fb.group({

      // GENERALES
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/)]],
      edad: ['', Validators.required],
      sobrenombre: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      curp: ['', [Validators.pattern(/^[A-Z0-9]{18}$/)]],
      originario: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      escolaridad: ['', Validators.required],
      estadoCivil: ['', Validators.required],
      nacionalidad: ['', Validators.required],
      lenguaIndigena: ['', Validators.required],
      religion: ['', Validators.required],
      ocupacion: ['', Validators.required],
      domicilio: ['', Validators.required],

      // JURÍDICO
      fechaDetencion: ['', Validators.required],
      faltaCivica: ['', Validators.required],
      relatoHechos: ['', Validators.required],

      // FAMILIA
      familiares: this.fb.array([]),
      observacionesFamilia: [''],

      // SUSTANCIAS
      consumeAlcohol: ['no', Validators.required],
      especificaConsumo: [''],

      haRecibidoTerapias: ['no', Validators.required],
      especificaTerapias: [''],

      necesitaApoyoPsicologico: ['no', Validators.required],
      especificaApoyo: [''],

      acudeSesionesGrupos: ['no', Validators.required],
      especificaDonde: [''],

      haEstadoRehabilitacion: ['no', Validators.required],
      especificaEnCual: [''],

      perteneceGrupoCultural: ['no', Validators.required],
      especificaGrupo: [''],

      // EMOCIONES
      miedo: ['', Validators.required],
      alegria: ['', Validators.required],
      enojo: ['', Validators.required],
      tristeza: ['', Validators.required],
      amor: ['', Validators.required],

      // SALUD
      destrezas: ['', Validators.required],
      deportes: ['', Validators.required],
      tiempoLibre: ['', Validators.required],
      saludGeneral: ['', Validators.required],
      enfermedadCronica: ['no', Validators.required],
      llevaTratamiento: ['no', Validators.required],
      detalleTratamiento: ['', ],


    });
  }

  ngOnInit() {
    this.validacionesDinamicas();

    // 1. RELLENAR CON DATOS DEL ADMIN
    if (this.datosAdmin) {
      this.entrevistaForm.patchValue({
        nombre: this.datosAdmin.beneficiario?.nombre || this.datosAdmin.nombre || '',
        edad: this.datosAdmin.edad || '', 
        curp: this.datosAdmin.curp || '',
        fechaNacimiento: this.datosAdmin.fechaNacimiento || '',
        domicilio: this.datosAdmin.domicilioCompleto || '',
        telefono: this.datosAdmin.telefonoContacto || '',
        fechaDetencion: this.datosAdmin.fechaDetencion || '',
        faltaCivica: this.datosAdmin.delitoImputado || this.datosAdmin.causaPenal || ''
      });
    }

    // 2. Datos del F1 (El nuevo esquema del psicólogo)
    if (this.datosF1) {
      this.entrevistaForm.patchValue({
        sobrenombre: this.datosF1.generalesEntrevista?.sobrenombre || '',
        originario: this.datosF1.generalesEntrevista?.originario || '',
        escolaridad: this.datosF1.generalesEntrevista?.escolaridad || '',
        estadoCivil: this.datosF1.generalesEntrevista?.estado_civil || '',
        ocupacion: this.datosF1.generalesEntrevista?.ocupacion || '',
        nacionalidad: this.datosF1.generalesEntrevista?.nacionalidad || '',      
        lenguaIndigena: this.datosF1.generalesEntrevista?.lengua_indigena || '',   
        religion: this.datosF1.generalesEntrevista?.religion || '',                
        
        relatoHechos: this.datosF1.situacionJuridicaF1?.relato_hechos || this.datosF1.motivoConsulta || '',
        faltaCivica: this.datosF1.situacionJuridicaF1?.falta_civica || '',
        observacionesFamilia: this.datosF1.nucleoFamiliarPrimario?.observacion_relacion || '',

        miedo: this.datosF1.perfilPersonal?.emociones?.miedo || '',
        alegria: this.datosF1.perfilPersonal?.emociones?.alegria || '',
        enojo: this.datosF1.perfilPersonal?.emociones?.enojo || '',
        tristeza: this.datosF1.perfilPersonal?.emociones?.tristeza || '',
        amor: this.datosF1.perfilPersonal?.emociones?.amor || '',

        destrezas: this.datosF1.perfilPersonal?.destrezas || '',
        deportes: this.datosF1.perfilPersonal?.deportes || '',
        tiempoLibre: this.datosF1.perfilPersonal?.tiempo_libre || '',



        saludGeneral: this.datosF1.saludDetalle?.descripcion_enfermedad || '',
        detalleTratamiento: this.datosF1.saludDetalle?.indique_tratamiento || '',
        
        especificaConsumo: this.datosF1.sustanciasDetalle?.especifique || '',
        especificaTerapias: this.datosF1.sustanciasDetalle?.donde_terapias || '',
        especificaDonde: this.datosF1.sustanciasDetalle?.donde_grupos_aa || '',
        especificaEnCual: this.datosF1.sustanciasDetalle?.donde_rehabilitacion || '',
        especificaGrupo: this.datosF1.sustanciasDetalle?.cual_grupo || ''
      });

      this.entrevistaForm.patchValue({
        consumeAlcohol: this.datosF1.consumeSustancias ? 'si' : 'no',
        necesitaApoyoPsicologico: this.datosF1.necesitaApoyoPsicologico ? 'si' : 'no',
        enfermedadCronica: this.datosF1.padeceEnfermedadCronica ? 'si' : 'no',
        llevaTratamiento: this.datosF1.saludDetalle?.lleva_tratamiento ? 'si' : 'no',
        
        haRecibidoTerapias: this.datosF1.sustanciasDetalle?.ha_recibido_terapias ? 'si' : 'no',
        acudeSesionesGrupos: this.datosF1.sustanciasDetalle?.asiste_grupos_aa ? 'si' : 'no',
        haEstadoRehabilitacion: this.datosF1.sustanciasDetalle?.ha_estado_rehabilitacion ? 'si' : 'no',
        perteneceGrupoCultural: this.datosF1.sustanciasDetalle?.pertenece_grupo_cultural ? 'si' : 'no'
      });

      if (this.datosF1.nucleoFamiliarPrimario?.miembros) {
        const familiaresArray = this.entrevistaForm.get('familiares') as FormArray;
        familiaresArray.clear(); 
        this.datosF1.nucleoFamiliarPrimario.miembros.forEach((m: any) => {
          familiaresArray.push(this.fb.group(m)); 
        });
      }
    }

    // 🔥 NUEVO: EJECUCIÓN PARA OBTENER DATOS REALES DE EXPEDIENTE Y BENEFICIARIO
    if (this.expedienteId) {
      this.cargarDatosDesdeBackend();
    }
  }

  // 🔥 NUEVO: MÉTODO QUE HACE LAS PETICIONES E IMPRIME EN CONSOLA
  cargarDatosDesdeBackend() {
    console.log('==== INICIANDO BÚSQUEDA EN BACKEND ====');
    console.log('1. Buscando Expediente con ID:', this.expedienteId);

    // Usamos getResumenCivico que recibe el ID y consulta /civico/expedientes/{id}
    this.civicoService.getResumenCivico(this.expedienteId as any).subscribe({
      next: (expediente: any) => {
        console.log('2. ✅ Datos del Expediente (/civico/expedientes/{id}):', expediente);
        
        // Buscar el ID del beneficiario
        const beneficiarioId = expediente.beneficiarioId || expediente.beneficiario_id || expediente.beneficiario?.id;
        
        if (beneficiarioId) {
          console.log('3. 🔍 ID del Beneficiario encontrado:', beneficiarioId);
          
          // Consultar a /beneficiarios/{id}
          this.civicoService.obtenerBeneficiario(beneficiarioId).subscribe({
            next: (beneficiario: any) => {
              console.log('4. ✅ Datos del Beneficiario (/beneficiarios/{id}):', beneficiario);
              
              // PARCHEAR LOS DATOS EN EL FORMULARIO (HTML)
              let edadCalculada = beneficiario.edad;
              if (!edadCalculada && beneficiario.fechaNacimiento) {
                edadCalculada = this.calcularEdad(beneficiario.fechaNacimiento);
              }

              this.entrevistaForm.patchValue({
                nombre: beneficiario.nombre || this.entrevistaForm.value.nombre,
                edad: edadCalculada || this.entrevistaForm.value.edad
              });
              
              console.log('5. 🚀 ¡Nombre y Edad inyectados exitosamente en el formulario!');
            },
            error: (err) => console.error('🔴 Error al obtener /beneficiarios/{id}:', err)
          });
        } else {
          console.warn('🟡 No se encontró un beneficiarioId en la respuesta del expediente.');
        }
      },
      error: (err) => console.error('🔴 Error al obtener /civico/expedientes/{id}:', err)
    });
  }

  // ✨ FUNCIÓN EXTRA (Ponla en cualquier lugar de tu clase)
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    // Si aún no cumple años en este año, le restamos 1
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return Math.max(0, edad); // Evitamos edades negativas
  }

  // 🔥 VALIDACIONES DINÁMICAS
  validacionesDinamicas() {
    const esSi = (v: string) => v === 'si';

    const setReq = (campo: string, depende: string) => {
      this.entrevistaForm.get(depende)?.valueChanges.subscribe(val => {
        const control = this.entrevistaForm.get(campo);
        esSi(val) ? control?.setValidators([Validators.required]) : control?.clearValidators();
        control?.updateValueAndValidity();
      });
    };

    setReq('especificaConsumo', 'consumeAlcohol');
    setReq('especificaTerapias', 'haRecibidoTerapias');
    setReq('especificaApoyo', 'necesitaApoyoPsicologico');
    setReq('especificaDonde', 'acudeSesionesGrupos');
    setReq('especificaEnCual', 'haEstadoRehabilitacion');
    setReq('especificaGrupo', 'perteneceGrupoCultural');
    setReq('detalleTratamiento', 'llevaTratamiento');
  }

  // 🔥 BOTÓN (ARREGLADO)
  formularioCompleto(): boolean {
    return this.entrevistaForm.valid;
  }

  // 🔥 SOLO NÚMEROS
  soloNumeros(event: any) {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
  }

  // 🔥 SOLO LETRAS
  soloLetras(event: any) {
    event.target.value = event.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ ]/g, '');
  }

  // 🔥 FAMILIARES
  get familiares(): FormArray {
    return this.entrevistaForm.get('familiares') as FormArray;
  }

  addFamiliar() {
    this.familiares.push(this.fb.group({
      nombre: [''],
      parentesco: [''],
      edad: [''],
      estadoCivil: [''],
      escolaridad: [''],
      ocupacion: ['']
    }));
  }

  // 🔥 SUBMIT
  onSubmit() {
    console.log('CLICK FUNCIONA');
    if (this.entrevistaForm.invalid) {
      this.entrevistaForm.markAllAsTouched();
      console.warn('Formulario inválido');
      return;
    }

    // Armamos nuestro paquete de datos
    const data = this.transformarData();
    console.log('DATA A ENVIAR:', data);

    //  DECISIÓN: ¿Actualizar o Crear?
    
    // Verifica cómo se llama la propiedad del ID en tu objeto. 
    // Puede ser id, idUUID, uuid, etc. Ajusta 'this.datosF1.id' a lo que use tu BD.
    if (this.datosF1 && this.datosF1.idUUID) { 
      
      // MODO EDICIÓN -> Usamos PATCH
      this.civicoService.actualizarF1(this.datosF1.idUUID, data).subscribe({
        next: (res) => {
          console.log('ENTREVISTA ACTUALIZADA', res);
          this.entrevistaGuardada.emit(res);
          // Opcional: this.entrevistaForm.reset();
        },
        error: (err) => {
          console.error(' ERROR AL ACTUALIZAR', err);
          alert('Error al actualizar la entrevista');
        }
      });

    } else {
      
      // MODO CREACIÓN -> Usamos POST
      this.civicoService.crearF1(data).subscribe({
        next: (res) => {
          console.log(' ENTREVISTA CREADA', res);
          this.entrevistaGuardada.emit(res);
          // Opcional: this.entrevistaForm.reset();
        },
        error: (err) => {
          console.error(' ERROR AL CREAR', err);
          alert('Error al guardar la entrevista');
        }
      });
    }
  }

  transformarData() {
    const f = this.entrevistaForm.value;

    // 1. Convertir la fecha al formato que el backend espera (@IsDateString)
    // En lugar de .split('T')[0], mandamos el ISOString completo.
    const fechaActualISO = new Date().toISOString(); 

    // 2. Extraer la información del formulario (igual que antes)
    return {
      expedienteId: this.expedienteId,
      psicologoId: 2, // ¡OJO! Asegúrate de que el psicologoId 2 exista en la base de datos de usuarios.
      fechaEntrevista: fechaActualISO, // 👈 SOLUCIÓN DE FECHA
      consentimientoInformado: true,
      riesgoSuicida: false, 
      consumeSustancias: f.consumeAlcohol === 'si',
      padeceEnfermedadCronica: f.enfermedadCronica === 'si',
      necesitaApoyoPsicologico: f.necesitaApoyoPsicologico === 'si',
      
      // Estos campos los declaraste como opcionales en el DTO, así que si están vacíos no hay problema
      motivoConsulta: f.relatoHechos || "",
      antecedentesClinicos: "", 
      examenMental: "",
      impresionDiagnostica: "",
      
      // Bloques JSONB
      generalesEntrevista: {
        institucion_canaliza: "Municipio de Oaxaca de Juárez",
        sobrenombre: f.sobrenombre || "",
        originario: f.originario || "",
        escolaridad: f.escolaridad || "",
        estado_civil: f.estadoCivil || "",
        nacionalidad: f.nacionalidad || "",
        lengua_indigena: f.lenguaIndigena || "",
        religion: f.religion || "",
        ocupacion: f.ocupacion || ""
      },
      situacionJuridicaF1: {
        fecha_detencion: f.fechaDetencion || null, // Si es tipo Date en la BD, un string vacío falla.
        falta_civica: f.faltaCivica || "",
        relato_hechos: f.relatoHechos || ""
      },
      nucleoFamiliarPrimario: {
        miembros: f.familiares || [], 
        observacion_relacion: f.observacionesFamilia || ""
      },
      sustanciasDetalle: {
        especifique: f.especificaConsumo || "",
        ha_recibido_terapias: f.haRecibidoTerapias === 'si',
        donde_terapias: f.especificaTerapias || "",
        asiste_grupos_aa: f.acudeSesionesGrupos === 'si',
        donde_grupos_aa: f.especificaDonde || "",
        ha_estado_rehabilitacion: f.haEstadoRehabilitacion === 'si',
        donde_rehabilitacion: f.especificaEnCual || "",
        periodo_rehabilitacion: "",
        pertenece_grupo_cultural: f.perteneceGrupoCultural === 'si',
        cual_grupo: f.especificaGrupo || ""
      },
      perfilPersonal: {
        emociones: {
          miedo: f.miedo || "",
          alegria: f.alegria || "",
          enojo: f.enojo || "",
          tristeza: f.tristeza || "",
          amor: f.amor || ""
        },
        destrezas: f.destrezas || "",
        deportes: f.deportes || "",
        tiempo_libre: f.tiempoLibre || ""
      },
      saludDetalle: {
        descripcion_enfermedad: f.saludGeneral || "",
        lleva_tratamiento: f.llevaTratamiento === 'si',
        indique_tratamiento: f.detalleTratamiento || ""
      },

      // El enum del DTO dice que debe ser "COMPLETADO" o "EN_PROCESO"
      estatusF1: "COMPLETADO" 
    };
  }

  // getters
  get consumeAlcohol() { return this.entrevistaForm.get('consumeAlcohol')?.value === 'si'; }
  get haRecibidoTerapias() { return this.entrevistaForm.get('haRecibidoTerapias')?.value === 'si'; }
  get necesitaApoyoPsicologico() { return this.entrevistaForm.get('necesitaApoyoPsicologico')?.value === 'si'; }
  get acudeSesionesGrupos() { return this.entrevistaForm.get('acudeSesionesGrupos')?.value === 'si'; }
  get haEstadoRehabilitacion() { return this.entrevistaForm.get('haEstadoRehabilitacion')?.value === 'si'; }
  get perteneceGrupoCultural() { return this.entrevistaForm.get('perteneceGrupoCultural')?.value === 'si'; }

}