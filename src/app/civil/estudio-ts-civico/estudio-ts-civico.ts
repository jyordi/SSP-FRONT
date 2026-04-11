import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { WordGeneratorService } from '../../services/word-generator.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-estudio-ts-civico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './estudio-ts-civico.html',
  styleUrls: ['./estudio-ts-civico.css']
})
export class EstudioTsCivicoComponent implements OnInit {

  @Input() expedienteId!: string;

  private fb = inject(FormBuilder);
  private civicoService = inject(Civico);
  private session = inject(SessionService);
  private wordGenerator = inject(WordGeneratorService);
  private toast = inject(ToastService);

  tsForm: FormGroup = new FormGroup({});
  
  cargandoF1 = true;
  f1Bloqueado = false;
  datosF1: any = null;
  
  guardando = false;
  guardadoExito = false;
  generandoPDF = false;
  
  f2Existente = false;
  f2IdPropio: string | null = null; 
  
  get puedeEditar(): boolean {
    return this.session.esTrabajadorSocial(); 
  }

  ngOnInit() {
    this.initForm();
    if (this.expedienteId) {
      this.cargarDatosBase();
    } else {
      this.cargandoF1 = false;
      this.f1Bloqueado = true;
    }

    if (!this.puedeEditar) {
      this.tsForm.disable();
    }
  }

  private initForm() {
    this.tsForm = this.fb.group({
      // Columnas críticas
      ingresoMensual: [null, [Validators.required, Validators.min(0)]],
      nivelSocioeconomico: ['', Validators.required],
      grupoFamiliar: ['', Validators.required],
      huboViolenciaIntrafamiliar: [false, Validators.required],
      especifiqueViolencia: [''],
      relacionesInterfamiliares: [''],
      diagnosticoSocial: ['', Validators.required],

      // JSONBs
      generalesF2: this.fb.group({
        escolaridad: [''],
        ocupacion: [''],
        estadoCivil: ['']
      }),
      situacionJuridicaF2: this.fb.group({
        causa: [''],
        juzgado: [''],
        horasSentencia: [0],
        delito: ['']
      }),
      nucleoPrimario: this.fb.group({
        integrantesHogar: [0],
        relacionConyuge: [''],
        relacionPadres: [''],
        relacionHermanos: [''],
        consumoAlcohol: [false],
        
        responsableManutencion: [''],
        egresosMensuales: [null],
        cooperaBeneficiario: ['']
      }),
      nucleoSecundario: this.fb.array([]),
      datosIndiciado: this.fb.group({
        vivienda: [''],
        transporte: [''],
        horario: [''],
        zona: ['']
      }),
      antecedentes: this.fb.group({
        antecedenteToxicologicoFamilia: [false],
        especifiqueToxico: [''],
        conceptoFamiliaHaciaIndiciado: [''],
        problemasConductaFam: ['']
      }),
      condicionesVivienda: this.fb.group({
        caracteristicas: [''],
        mobiliario: [''],
        serviciosPublicos: ['']
      }),
      historialLaboral: this.fb.group({
        trabajoAnterior: [''],
        tiempoLaborar: [''],
        sueldoPropio: [null],
        aportacionesAparteIndiciado: [''],
        distribucionGastos: [''],
        alimentacion: [''],
        ofertaTrabajo: [false],
        consisteOferta: ['']
      }),
      opinionObservaciones: this.fb.group({
        recomendacion: [''],
        prioridad: [''],
        relacionMedioExterno: [''],
        opinionProgramaReconecta: ['']
      })
    });
  }

  get nucleoSecundarioArray(): FormArray {
    return this.tsForm.get('nucleoSecundario') as FormArray;
  }

  addFamiliarSecundario() {
    this.nucleoSecundarioArray.push(this.fb.group({
      nombre2: [''],
      parentesco2: [''],
      edad2: [''],
      edoCivil2: [''],
      escolaridad2: [''],
      ocupacion2: ['']
    }));
  }

  removeFamiliarSecundario(index: number) {
    this.nucleoSecundarioArray.removeAt(index);
  }

  private cargarDatosBase() {
    this.cargandoF1 = true;
    forkJoin({
      f1: this.civicoService.obtenerF1PorExpediente(this.expedienteId),
      exp: this.civicoService.getExpedienteCivico(this.expedienteId)
    }).subscribe({
      next: (res: any) => {
        this.cargandoF1 = false;
        
        // El F1 es el que bloquea o permite el F2
        if (res.f1 && !res.f1.error && Object.keys(res.f1).length > 0) {
          this.f1Bloqueado = false;
          this.extraerF1(res.f1, res.exp);
          this.verificarF2();
        } else {
          this.f1Bloqueado = true;
        }
      },
      error: () => {
        this.cargandoF1 = false;
        this.f1Bloqueado = true;
      }
    });
  }

  private calcularEdad(fechaNac: string): string {
    if (!fechaNac || fechaNac === 'No Especificado') return 'No especificada';
    try {
      const birth = new Date(fechaNac);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age.toString();
    } catch {
      return 'No especificada';
    }
  }

  private extraerF1(data: any, exp: any = null) {
    this.datosF1 = {
      nombre: exp?.beneficiario?.nombre || data.generalesEntrevista?.nombre || data.nombre || 'No Especificado',
      edad: exp?.fechaNacimiento ? this.calcularEdad(exp.fechaNacimiento) : (data.edad || 'No especificada'),
      sobrenombre: data.generalesEntrevista?.sobrenombre || exp?.aliasSobrenombre || 'No Especificado',
      fechaNacimiento: exp?.fechaNacimiento || data.fechaNacimiento || 'No Especificado',
      originario: data.generalesEntrevista?.originario || exp?.originario || 'No Especificado',
      telefono: exp?.telefonoContacto || data.telefono || 'No Especificado',
      escolaridad: data.generalesEntrevista?.escolaridad || exp?.escolaridadActual || 'No Especificado',
      estadoCivil: data.generalesEntrevista?.estado_civil || exp?.estadoCivil || 'No Especificado',
      nacionalidad: data.generalesEntrevista?.nacionalidad || exp?.nacionalidad || 'No Especificado',
      lenguaIndigena: data.generalesEntrevista?.lengua_indigena || exp?.lenguaIndigena || 'Ninguna',
      religion: data.generalesEntrevista?.religion || exp?.religion || 'No Especificado',
      ocupacion: data.generalesEntrevista?.ocupacion || exp?.ocupacionActual || 'No Especificado',
      domicilio: exp?.domicilioCompleto || exp?.domicilio_completo || data.domicilioCompleto || data.generalesEntrevista?.domicilio || 'No Especificado',
      fechaDetencion: data.situacionJuridicaF1?.fecha_detencion || exp?.fechaDetencion || 'No Especificado',
      faltaCivica: data.situacionJuridicaF1?.falta_civica || exp?.delitoImputado || 'No Especificado',
      juzgado: exp?.numJuzgadoCivico || 'No Especificado',
      expediente: exp?.causaPenal || 'No Especificado',
      horasSentencia: exp?.horasSentencia || 0,
      relatoHechos: data.situacionJuridicaF1?.relato_hechos || 'Sin relato preexistente',
      familiaPrimaria: data.nucleoFamiliarPrimario?.miembros || [],
      observacionesFamiliaPrimaria: data.nucleoFamiliarPrimario?.observacion_relacion || 'Ninguna',
      adicciones: data.consumeSustancias ? 'Sí' : 'No',
      detalleAdicciones: data.sustanciasDetalle?.especifique || 'Ninguna documentada',
      terapias: data.sustanciasDetalle?.ha_recibido_terapias ? 'Sí' : 'No',
      gruposAA: data.sustanciasDetalle?.asiste_grupos_aa ? 'Sí' : 'No',
      detalleGruposAA: data.sustanciasDetalle?.donde_grupos_aa || 'N/A'
    };
  }

  private verificarF2() {
    this.civicoService.obtenerF2PorExpediente(this.expedienteId).subscribe({
      next: (f2Res: any) => {
        if (f2Res && (f2Res.id || f2Res.expedienteId || f2Res.idUUID)) {
          this.f2Existente = true;
          this.f2IdPropio = f2Res.idUUID || f2Res.id || f2Res.expedienteId;
          
          this.tsForm.patchValue({
            ingresoMensual: f2Res.ingresoMensual,
            nivelSocioeconomico: f2Res.nivelSocioeconomico,
            grupoFamiliar: f2Res.grupoFamiliar,
            huboViolenciaIntrafamiliar: f2Res.huboViolenciaIntrafamiliar,
            diagnosticoSocial: f2Res.diagnosticoSocial,
            generalesF2: f2Res.generalesF2 || {},
            situacionJuridicaF2: f2Res.situacionJuridicaF2 || {},
            nucleoPrimario: f2Res.nucleoPrimario || {},
            datosIndiciado: f2Res.datosIndiciado || {},
            antecedentes: f2Res.datosIndiciado?.antecedentes_extra || {},
            condicionesVivienda: f2Res.datosIndiciado?.vivienda_extra || {},
            historialLaboral: f2Res.generalesF2?.laboral_extra || {},
            opinionObservaciones: f2Res.opinionObservaciones || {}
          });

          // Rellenar array dinámico si existe
          if (f2Res.nucleoSecundario && f2Res.nucleoSecundario.miembros && Array.isArray(f2Res.nucleoSecundario.miembros)) {
            this.nucleoSecundarioArray.clear();
            f2Res.nucleoSecundario.miembros.forEach((m: any) => {
              this.nucleoSecundarioArray.push(this.fb.group(m));
            });
          }
        }
      },
      error: () => {
        this.f2Existente = false;
        // AUTO-RELLENADO INTELIGENTE: Si no hay F2 previo, pre-cargamos para TS lo que ya dio en F1 o Expediente
        this.tsForm.patchValue({
          generalesF2: {
            escolaridad: this.datosF1?.escolaridad !== 'No Especificado' ? this.datosF1?.escolaridad : '',
            ocupacion: this.datosF1?.ocupacion !== 'No Especificado' ? this.datosF1?.ocupacion : '',
            estadoCivil: this.datosF1?.estadoCivil !== 'No Especificado' ? this.datosF1?.estadoCivil : '',
          },
          situacionJuridicaF2: {
            causa: this.datosF1?.expediente !== 'No Especificado' ? this.datosF1?.expediente : '',
            juzgado: this.datosF1?.juzgado !== 'No Especificado' ? this.datosF1?.juzgado : '',
            horasSentencia: this.datosF1?.horasSentencia || 0,
            delito: this.datosF1?.faltaCivica !== 'No Especificado' ? this.datosF1?.faltaCivica : ''
          }
        });
      }
    });
  }

  guardarF2() {
    if (this.tsForm.invalid || this.f1Bloqueado) {
       this.tsForm.markAllAsTouched();
       return;
    }
    
    this.guardando = true;
    this.guardadoExito = false;
    
    const formVals = this.tsForm.value;

    const payload = {
      expedienteId: this.expedienteId,
      trabajadorSocialId: this.session.getUserId() || 1,
      ingresoMensual: formVals.ingresoMensual ? Number(formVals.ingresoMensual) : undefined,
      nivelSocioeconomico: formVals.nivelSocioeconomico || undefined,
      grupoFamiliar: formVals.grupoFamiliar || undefined,
      huboViolenciaIntrafamiliar: formVals.huboViolenciaIntrafamiliar,
      diagnosticoSocial: formVals.diagnosticoSocial || undefined,
      generalesF2: { 
        ...formVals.generalesF2, 
        laboral_extra: formVals.historialLaboral 
      },
      situacionJuridicaF2: formVals.situacionJuridicaF2,
      nucleoPrimario: formVals.nucleoPrimario,
      nucleoSecundario: { miembros: formVals.nucleoSecundario },
      datosIndiciado: { 
        ...formVals.datosIndiciado, 
        vivienda_extra: formVals.condicionesVivienda,
        antecedentes_extra: formVals.antecedentes
      },
      opinionObservaciones: formVals.opinionObservaciones,
      estatusF2: 'COMPLETADO'
    };

    if (this.f2Existente && this.f2IdPropio) {
      this.civicoService.actualizarF2(this.f2IdPropio, payload).subscribe({
        next: () => this.finalizarGuardado(),
        error: (err) => this.manejarErrorGuardado(err)
      });
    } else {
      this.civicoService.crearF2(payload).subscribe({
        next: (res: any) => {
          this.f2Existente = true;
          this.f2IdPropio = res.idUUID || res.id;
          this.finalizarGuardado();
        },
        error: (err) => this.manejarErrorGuardado(err)
      });
    }
  }

  private finalizarGuardado() {
    this.guardando = false;
    this.toast.showSuccess("Estudio Socioeconómico (F2) guardado correctamente.");
  }

  private manejarErrorGuardado(err: any) {
    this.guardando = false;
    let mensajeBack = "Desconocido";
    if (err.error && err.error.message) {
      mensajeBack = Array.isArray(err.error.message) ? err.error.message.join('\n') : err.error.message;
    }
    this.toast.showError('Error al guardar F2: ' + mensajeBack);
  }

  // PDF generation backend legacy code removed. Only Word output will be generated.

  async generarWordLocal() {
    if (this.f1Bloqueado) return;
    this.generandoPDF = true;
    try {
      const f1 = this.datosF1 || {};
      const form = this.tsForm.value;

      // 1. Núcleo Familiar (Directo del F1)
      const nucleoFamiliarArray: any[] = f1.familiaPrimaria || [];
      const nucleoSecundarioArr = form.nucleoSecundario || [];

      // Lógica de Checkboxes (Para pintar la X en Word)
      const func = form.grupoFamiliar === 'FUNCIONAL' ? 'x' : ' ';
      const disfunc = form.grupoFamiliar === 'DISFUNCIONAL' ? 'x' : ' ';
      
      const relAdec = form.nucleoPrimario?.relacionesInterfamiliares === 'ADECUADAS' ? 'x' : ' ';
      const relInadec = form.nucleoPrimario?.relacionesInterfamiliares === 'INADECUADAS' ? 'x' : ' ';
      
      const zUrbana = form.datosIndiciado?.zona === 'URBANA' ? 'x' : ' ';
      const zSub = form.datosIndiciado?.zona === 'SUB-URBANA' ? 'x' : ' ';
      const zRural = form.datosIndiciado?.zona === 'RURAL' ? 'x' : ' ';
      const zCrimi = form.datosIndiciado?.zona === 'CRIMINOGENA' ? 'x' : ' ';

      const chkAlto = form.nivelSocioeconomico === 'ALTO' ? 'x' : ' ';
      const chkMedio = form.nivelSocioeconomico === 'MEDIO' ? 'x' : ' ';
      const chkBajo = form.nivelSocioeconomico === 'BAJO' ? 'x' : ' ';

      const antecedenteToxico = form.antecedentes?.antecedenteToxicologicoFamilia ? 'SÍ' : 'NO';
      const ofertaTrabajoSi = form.historialLaboral?.ofertaTrabajo ? 'x' : ' ';
      const ofertaTrabajoNo = form.historialLaboral?.ofertaTrabajo ? ' ' : 'x';

      const hayViolencia = form.huboViolenciaIntrafamiliar ? 'SÍ' : 'NO';

      const datosTemplate = {
        // Datos generales extraídos del F1
        // Datos generales extraídos del F1
        nombreBeneficiario: f1.nombre || '—',
        nombre: f1.nombre || '—', 
        nombreCompleto: f1.nombre || '—', // Alias extra
        imputado: f1.nombre || '—', // Alias extra
        
        edad: f1.edad || '—',
        sobrenombre: f1.sobrenombre || '—',
        fecha_nacimiento: f1.fechaNacimiento || '—',
        originario: f1.originario || '—',
        telefono: f1.telefono || '—',
        nacionalidad: f1.nacionalidad || '—',
        lengua_indigena: f1.lenguaIndigena || '—',
        religion: f1.religion || '—',
        
        domicilioCompleto: f1.domicilio || '—',
        domicilio: f1.domicilio || '—', // Alias extra
        direccion: f1.domicilio || '—', // Alias extra
        
        fecha_detencion: f1.fechaDetencion || '—',
        delito_imputado: f1.faltaCivica || '—',
        escolaridad: f1.escolaridad || form.generalesF2?.escolaridad || '—',
        ocupacion: f1.ocupacion || form.generalesF2?.ocupacion || '—',
        estado_civil: f1.estadoCivil || form.generalesF2?.estadoCivil || '—',
        juzgado: form.situacionJuridicaF2?.juzgado || '—',
        expediente: form.situacionJuridicaF2?.causa || '—',

        // 14. Tabla de Familia
        nucleoFamiliar: nucleoFamiliarArray,
        
        // 15. Zona y Economia general
        chkUrbana: zUrbana,
        chkSub: zSub,
        chkRural: zRural,
        chkCriminogena: zCrimi,
        responsablemanu: form.nucleoPrimario?.responsableManutencion || '—',
        ingresosMensuales: form.ingresoMensual || '—',
        egresosMensuales: form.nucleoPrimario?.egresosMensuales || '—',
        cooperaFamilia: form.nucleoPrimario?.cooperaBeneficiario || '—',

        // Características Familia Primaria
        chkFuncional: func,
        chkDisfuncional: disfunc,
        chkAdec: relAdec, 
        chkInadec: relInadec, 
        huboViolencia: hayViolencia,
        encasoespe: form.nucleoPrimario?.especifiqueViolencia || '—', 

        // PAGINA 3
        chkalto: chkAlto,
        chkmed: chkMedio,
        chkba: chkBajo,
        tipotox: antecedenteToxico,
        especitox: form.antecedentes?.especifiqueToxico || '—',
        conceptoIndi: form.antecedentes?.conceptoFamiliaHaciaIndiciado || '—',
        
        // 16. Nucleo Secundario
        nucleoFamiliar2: nucleoSecundarioArr,
        hijos: '—', // No en el form, pendiente
        caracteristicasvi: form.condicionesVivienda?.caracteristicas || '—',
        transporte: form.datosIndiciado?.transporte || '—',
        moviliario: form.condicionesVivienda?.mobiliario || '—',

        // PAGINA 4
        relacionmedio: form.opinionObservaciones?.relacionMedioExterno || '—',
        espefami: form.antecedentes?.problemasConductaFam || '—',
        numpare: '—', // Pendiente

        // 17. DATOS DEL INDICIADO
        trabajoan: form.historialLaboral?.trabajoAnterior || '—',
        tiempola: form.historialLaboral?.tiempoLaborar || '—',
        sueldo: form.historialLaboral?.sueldoPropio || '—',
        aportaciones: form.historialLaboral?.aportacionesAparteIndiciado || '—',
        distribucion: form.historialLaboral?.distribucionGastos || '—',
        alimentacion: form.historialLaboral?.alimentacion || '—',
        servicios: form.condicionesVivienda?.serviciosPublicos || '—',

        // PAGINA 5
        chkofiSi: ofertaTrabajoSi,
        chkofiNo: ofertaTrabajoNo,
        consiste: form.historialLaboral?.consisteOferta || '—',
        
        // Atributos Psicológicos (Heredados del F1)
        chkApoyoSi: 'x', // Preparar keys únicas
        chkApoyoNo: ' ',
        grupos: f1.gruposAA === 'Sí' ? f1.detalleGruposAA : 'No asiste a grupos',
        chkBebeSi: f1.adicciones === 'Sí' ? 'x' : ' ',
        chkBebeNo: f1.adicciones === 'Sí' ? ' ' : 'x',
        espe: f1.detalleAdicciones || '—',
        chkTerapiaSi: f1.terapias === 'Sí' ? 'x' : ' ',
        chkTerapiaNo: f1.terapias === 'Sí' ? ' ' : 'x',
        donde: f1.detalleGruposAA || '—',
        periodo: '—',
        
        // Observaciones / Diagnostico Final
        observaciones: form.opinionObservaciones?.opinionProgramaReconecta || '—',
        diagnostico: form.diagnosticoSocial || '—'
      };

      this.toast.showSuccess(`Generando documento de TS para ${f1.nombre || 'el beneficiario'}...`);
      await this.wordGenerator.generarDesdePlantilla(
        'F2-plantilla.docx', 
        datosTemplate, 
        `F2_TrabajoSocial_${f1.nombre || 'Beneficiario'}.docx`
      );
      this.generandoPDF = false;
    } catch (error: any) {
      this.generandoPDF = false;
      this.toast.showError('Error generando Word: ' + (error.message || error));
    }
  }
}
