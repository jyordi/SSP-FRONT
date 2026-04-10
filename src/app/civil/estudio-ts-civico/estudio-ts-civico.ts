import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';

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
    return this.session.esTrabajadorSocial(); // Admin solo visualiza
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
      // Jurídico Complementario
      juzgado: ['', Validators.required],
      expedientePenal: ['', Validators.required],
      
      // Laboral y Económico Indiciado
      lugarTrabajo: [''],
      antiguedad: [''],
      
      // Situación Económica General
      ingresos: ['', Validators.required],
      egresos: ['', Validators.required],
      responsableHogar: ['', Validators.required],
      nivelSocioeconomico: ['', Validators.required],

      // Núcleo Secundario
      familiaresSecundarios: this.fb.array([]),

      // Características Familiares
      tipoFamilia: ['', Validators.required],
      relacionesInterfamiliares: ['', Validators.required],
      violenciaIntrafamiliar: ['', Validators.required],

      // Vivienda y Entorno
      tipoZona: ['', Validators.required],
      serviciosPublicos: [''],
      transporte: [''],
      mobiliario: [''],
      tipoVivienda: ['', Validators.required],

      // Opiniones
      opinionPrograma: ['', Validators.required],
      diagnostico: ['', Validators.required]
    });
  }

  get familiaresSecundarios(): FormArray {
    return this.tsForm.get('familiaresSecundarios') as FormArray;
  }

  addFamiliar() {
    this.familiaresSecundarios.push(this.fb.group({
      nombre: ['', Validators.required],
      parentesco: ['', Validators.required],
      edad: [''],
      ocupacion: ['']
    }));
  }

  removeFamiliar(index: number) {
    this.familiaresSecundarios.removeAt(index);
  }

  private cargarDatosBase() {
    // REGLA 1: Verificar existencia F1 antes de operar
    this.civicoService.obtenerF1PorExpediente(this.expedienteId).subscribe({
      next: (f1Res: any) => {
        this.cargandoF1 = false;
        
        if (f1Res && Object.keys(f1Res).length > 0 && !f1Res.error) {
          this.f1Bloqueado = false;
          this.extraerF1(f1Res);
          // F1 verificado, buscar F2
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

  private extraerF1(data: any) {
    this.datosF1 = {
      // Generales
      nombre: data.generalesEntrevista?.nombre || data.nombre || data.nombreCompleto || 'No Especificado',
      edad: data.edad || 'No especificada',
      sobrenombre: data.generalesEntrevista?.sobrenombre || 'No Especificado',
      fechaNacimiento: data.fechaNacimiento || 'No Especificado',
      originario: data.generalesEntrevista?.originario || 'No Especificado',
      telefono: data.telefono || data.telefonoContacto || 'No Especificado',
      escolaridad: data.generalesEntrevista?.escolaridad || 'No Especificado',
      estadoCivil: data.generalesEntrevista?.estado_civil || 'No Especificado',
      nacionalidad: data.generalesEntrevista?.nacionalidad || 'No Especificado',
      lenguaIndigena: data.generalesEntrevista?.lengua_indigena || 'Ninguna',
      religion: data.generalesEntrevista?.religion || 'No Especificado',
      ocupacion: data.generalesEntrevista?.ocupacion || 'No Especificado',
      domicilio: data.domicilioCompleto || data.generalesEntrevista?.domicilio || 'No Especificado',
      
      // Jurídico F1
      fechaDetencion: data.situacionJuridicaF1?.fecha_detencion || data.fechaDetencion || 'No Especificado',
      faltaCivica: data.situacionJuridicaF1?.falta_civica || data.delito || 'No Especificado',
      relatoHechos: data.situacionJuridicaF1?.relato_hechos || 'Sin relato preexistente',
      
      // Familia Primaria F1
      familiaPrimaria: data.nucleoFamiliarPrimario?.miembros || [],
      observacionesFamiliaPrimaria: data.nucleoFamiliarPrimario?.observacion_relacion || 'Ninguna',

      // Adicciones y Terapias F1
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
          this.f2IdPropio = f2Res.idUUID || f2Res.id || f2Res.expedienteId; // Fallback por si la PK se llame diferente
          
          // Mapeo inverso: DTO Backend Anidado -> Flat tsForm Angular
          this.tsForm.patchValue({
            // Críticos
            ingresos: f2Res.ingresoMensual,
            nivelSocioeconomico: f2Res.nivelSocioeconomico,
            tipoFamilia: f2Res.grupoFamiliar,
            diagnostico: f2Res.diagnosticoSocial,
            
            // JSONB generalesF2
            tipoVivienda: f2Res.generalesF2?.tipoVivienda,
            tipoZona: f2Res.generalesF2?.tipoZona,
            serviciosPublicos: f2Res.generalesF2?.serviciosPublicos,
            transporte: f2Res.generalesF2?.transporte,
            mobiliario: f2Res.generalesF2?.mobiliario,
            responsableHogar: f2Res.generalesF2?.responsableHogar,
            egresos: f2Res.generalesF2?.egresos,

            // JSONB situacionJuridicaF2
            juzgado: f2Res.situacionJuridicaF2?.juzgado,
            expedientePenal: f2Res.situacionJuridicaF2?.expedientePenal,

            // JSONB nucleoPrimario
            relacionesInterfamiliares: f2Res.nucleoPrimario?.relacionesInterfamiliares,
            violenciaIntrafamiliar: f2Res.nucleoPrimario?.detalleViolencia || (f2Res.huboViolenciaIntrafamiliar ? 'Sí' : ''),

            // JSONB datosIndiciado
            lugarTrabajo: f2Res.datosIndiciado?.lugarTrabajo,
            antiguedad: f2Res.datosIndiciado?.antiguedad,

            // JSONB opinionObservaciones
            opinionPrograma: f2Res.opinionObservaciones?.opinionPrograma
          });
          
          // Reconstruir form arrays
          if (f2Res.nucleoSecundario && f2Res.nucleoSecundario.familiares) {
            this.familiaresSecundarios.clear();
            const arr = Array.isArray(f2Res.nucleoSecundario.familiares) ? f2Res.nucleoSecundario.familiares : [];
            arr.forEach((fam: any) => {
              this.familiaresSecundarios.push(this.fb.group({
                nombre: [fam.nombre || '', Validators.required],
                parentesco: [fam.parentesco || '', Validators.required],
                edad: [fam.edad || ''],
                ocupacion: [fam.ocupacion || '']
              }));
            });
          }
        }
      },
      error: () => {
        this.f2Existente = false;
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
    
    const f2 = this.tsForm.value;

    // ── MAPEANDO EL DTO DEL BACKEND (`CreateEstudioSocioeconomicoDto`) ──
    const payload = {
      expedienteId: this.expedienteId,
      trabajadorSocialId: this.session.getUserId() || 1, // Recuperar ID de sesión
      
      ingresoMensual: f2.ingresos ? Number(f2.ingresos) : undefined,
      nivelSocioeconomico: f2.nivelSocioeconomico || undefined,
      grupoFamiliar: f2.tipoFamilia || undefined,
      huboViolenciaIntrafamiliar: f2.violenciaIntrafamiliar && f2.violenciaIntrafamiliar.toLowerCase().trim() !== 'no' && f2.violenciaIntrafamiliar.trim() !== '',
      diagnosticoSocial: f2.diagnostico || undefined,

      // -- JSONBs --
      generalesF2: {
        tipoVivienda: f2.tipoVivienda,
        tipoZona: f2.tipoZona,
        serviciosPublicos: f2.serviciosPublicos,
        transporte: f2.transporte,
        mobiliario: f2.mobiliario,
        responsableHogar: f2.responsableHogar,
        egresos: f2.egresos,
      },
      situacionJuridicaF2: {
        juzgado: f2.juzgado,
        expedientePenal: f2.expedientePenal
      },
      nucleoPrimario: {
        relacionesInterfamiliares: f2.relacionesInterfamiliares,
        detalleViolencia: f2.violenciaIntrafamiliar // Pasamos el texto
      },
      nucleoSecundario: {
        familiares: f2.familiaresSecundarios || []
      },
      datosIndiciado: {
        lugarTrabajo: f2.lugarTrabajo,
        antiguedad: f2.antiguedad
      },
      opinionObservaciones: {
        opinionPrograma: f2.opinionPrograma
      },
      estatusF2: 'COMPLETADO' // Enum genérico opcional
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
    this.guardadoExito = true;
    setTimeout(() => this.guardadoExito = false, 3000);
  }

  private manejarErrorGuardado(err: any) {
    this.guardando = false;
    
    // Extracción de la validación exacta del backend para NestJS (class-validator)
    let mensajeBack = "Desconocido";
    if (err.error && err.error.message) {
      mensajeBack = Array.isArray(err.error.message) ? err.error.message.join('\n') : err.error.message;
    }

    alert('Tu Servidor rechazó el guardado. Los errores de validación de tu Backend son:\n\n' + mensajeBack);
    console.error('Data del BadRequest:', err);
  }

  generarPDF() {
    if (this.f1Bloqueado) return;
    this.generandoPDF = true;

    if (!(window as any).jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        this.construirDocumento();
      };
      document.body.appendChild(script);
    } else {
      this.construirDocumento();
    }
  }

  private construirDocumento() {
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF('p', 'mm', 'letter');
      const f1 = this.datosF1;
      const f2 = this.tsForm.value;

      // === FUNCION DE AYUDA PARA PAGINACION AUTOMÁTICA SECUENCIAL ===
      let lineY = 20;

      const controlSaltoHoja = (espacioRequerido: number) => {
        if ((lineY + espacioRequerido) > 260) {
          doc.addPage();
          lineY = 20;
          
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("Estudio de Trabajo Social - Continuación", 105, 10, { align: "center" });
          doc.setFontSize(10);
        }
      };

      const tituloSeccion = (titulo: string) => {
        controlSaltoHoja(12);
        doc.setFillColor(230, 230, 230);
        doc.rect(14, lineY, 188, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text(titulo, 16, lineY + 5);
        doc.setFont("helvetica", "normal");
        lineY += 12;
      };

      // ==== HOJA 1: ENCABEZADO Y DATOS DE PSICOLOGIA (F1) ====
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("ESTUDIO DE TRABAJO SOCIAL CÍVICO", 105, lineY, { align: "center" });
      lineY += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("SUBSECRETARÍA DE PREVENCIÓN Y REINSERCIÓN SOCIAL", 105, lineY, { align: "center" });
      lineY += 15;

      tituloSeccion("1. FICHA DE IDENTIFICACIÓN (Extracción Psicológica)");
      
      const col1 = 14; const col2 = 105;
      doc.text(`Nombre: ${f1.nombre}`, col1, lineY); 
      doc.text(`Edad: ${f1.edad}`, col2, lineY); lineY += 6;
      doc.text(`Sobrenombre: ${f1.sobrenombre}`, col1, lineY); 
      doc.text(`Originario: ${f1.originario}`, col2, lineY); lineY += 6;
      doc.text(`Fecha Nacimiento: ${f1.fechaNacimiento}`, col1, lineY); 
      doc.text(`Ocupación: ${f1.ocupacion}`, col2, lineY); lineY += 6;
      doc.text(`Escolaridad: ${f1.escolaridad}`, col1, lineY); 
      doc.text(`Teléfono: ${f1.telefono}`, col2, lineY); lineY += 6;
      doc.text(`Estado Civil: ${f1.estadoCivil}`, col1, lineY); 
      doc.text(`Religión: ${f1.religion}`, col2, lineY); lineY += 6;
      doc.text(`Nacionalidad: ${f1.nacionalidad}`, col1, lineY); 
      doc.text(`Lengua/Idioma: ${f1.lenguaIndigena}`, col2, lineY); lineY += 8;
      
      doc.text(`Domicilio:`, col1, lineY); lineY += 5;
      const splitDom = doc.splitTextToSize(f1.domicilio, 188);
      doc.text(splitDom, col1, lineY); lineY += (splitDom.length * 5) + 4;

      tituloSeccion("2. SITUACIÓN JURÍDICA");
      doc.text(`Fecha de Detención: ${f1.fechaDetencion}`, col1, lineY); lineY += 6;
      doc.text(`Delito/Falta Cívica: ${f1.faltaCivica}`, col1, lineY); lineY += 8;
      
      doc.setFont("helvetica", "bold");
      doc.text("Hechos relatados (Psicología):", col1, lineY); lineY += 5;
      doc.setFont("helvetica", "normal");
      const splitHechos = doc.splitTextToSize(f1.relatoHechos, 188);
      doc.text(splitHechos, col1, lineY); lineY += (splitHechos.length * 5) + 4;

      controlSaltoHoja(30);
      doc.setFont("helvetica", "bold");
      doc.text("Datos de Seguimiento Jca. (Captura TS):", col1, lineY); lineY += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Juzgado: ${f2.juzgado}`, col1, lineY); 
      doc.text(`Carpeta/Expediente: ${f2.expedientePenal}`, col2, lineY); lineY += 10;

      // ==== HOJA 2 APROX: FAMILIAREN ====
      tituloSeccion("3. NÚCLEO FAMILIAR (Primario - Psicológico)");
      if (f1.familiaPrimaria && f1.familiaPrimaria.length > 0) {
         let maxColWidth = [45, 30, 20, 40, 50]; 
         doc.setFontSize(8);
         doc.text("NOMBRE", 14, lineY); doc.text("PARENTESCO", 60, lineY); doc.text("EDAD", 95, lineY); doc.text("ESTADO CIV.", 120, lineY); doc.text("OCUPACIÓN", 160, lineY);
         lineY += 4; doc.line(14, lineY, 200, lineY); lineY += 4;
         
         f1.familiaPrimaria.forEach((fam: any) => {
            controlSaltoHoja(10);
            doc.text(String(fam.nombre || '').substring(0, 25), 14, lineY);
            doc.text(String(fam.parentesco || ''), 60, lineY);
            doc.text(String(fam.edad || ''), 95, lineY);
            doc.text(String(fam.estadoCivil || ''), 120, lineY);
            doc.text(String(fam.ocupacion || '').substring(0, 20), 160, lineY);
            lineY += 5;
         });
         doc.setFontSize(10);
         lineY += 5;
      } else {
         doc.text("No se documentaron familiares primarios.", col1, lineY); lineY += 8;
      }
      
      controlSaltoHoja(25);
      tituloSeccion("4. NÚCLEO FAMILIAR (Secundario - Captura TS)");
      if (f2.familiaresSecundarios && f2.familiaresSecundarios.length > 0) {
         doc.setFontSize(8);
         doc.text("NOMBRE", 14, lineY); doc.text("PARENTESCO", 80, lineY); doc.text("EDAD", 120, lineY); doc.text("OCUPACIÓN", 150, lineY);
         lineY += 4; doc.line(14, lineY, 200, lineY); lineY += 4;
         f2.familiaresSecundarios.forEach((fs: any) => {
            controlSaltoHoja(10);
            doc.text(String(fs.nombre || '').substring(0, 40), 14, lineY);
            doc.text(String(fs.parentesco || ''), 80, lineY);
            doc.text(String(fs.edad || ''), 120, lineY);
            doc.text(String(fs.ocupacion || '').substring(0, 25), 150, lineY);
            lineY += 5;
         });
         doc.setFontSize(10);
         lineY += 5;
      } else {
         doc.text("Sin núcleo familiar secundario registrado.", col1, lineY); lineY += 8;
      }

      controlSaltoHoja(40);
      tituloSeccion("5. CARACTERÍSTICAS FAMILIARES (Trabajo Social)");
      doc.text(`Tipo de Familia: ${f2.tipoFamilia}`, col1, lineY); lineY += 6;
      doc.setFont("helvetica", "bold"); doc.text("Relaciones Interfamiliares:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitRelaciones = doc.splitTextToSize(f2.relacionesInterfamiliares, 188);
      doc.text(splitRelaciones, col1, lineY); lineY += (splitRelaciones.length * 5) + 3;
      
      controlSaltoHoja(20);
      doc.setFont("helvetica", "bold"); doc.text("Violencia Intrafamiliar:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitVio = doc.splitTextToSize(f2.violenciaIntrafamiliar, 188);
      doc.text(splitVio, col1, lineY); lineY += (splitVio.length * 5) + 6;

      // ==== HOJA 3: ECONOMIA, VIVIENDA, DIAGNOSTICO ====
      controlSaltoHoja(40);
      tituloSeccion("6. SITUACIÓN ECONÓMICA Y LABORAL");
      doc.text(`Lugar de Trabajo del Indiciado: ${f2.lugarTrabajo}`, col1, lineY); lineY += 6;
      doc.text(`Antigüedad Laboral: ${f2.antiguedad}`, col1, lineY); lineY += 8;
      
      doc.text(`Responsable Económico del Hogar: ${f2.responsableHogar}`, col1, lineY); lineY += 6;
      doc.text(`Ingresos Totales (Mensual): $${f2.ingresos}`, col1, lineY);
      doc.text(`Egresos Totales (Mensual): $${f2.egresos}`, col2, lineY); lineY += 6;
      doc.text(`Nivel Socioeconómico Establecido: ${f2.nivelSocioeconomico}`, col1, lineY); lineY += 8;

      controlSaltoHoja(30);
      tituloSeccion("7. VIVIENDA Y ENTORNO");
      doc.text(`Tipo de Vivienda: ${f2.tipoVivienda}`, col1, lineY); 
      doc.text(`Zona Geográfica: ${f2.tipoZona}`, col2, lineY); lineY += 6;
      
      doc.setFont("helvetica", "bold"); doc.text("Servicios Públicos:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitSer = doc.splitTextToSize(f2.serviciosPublicos, 188); doc.text(splitSer, col1, lineY); lineY += (splitSer.length * 5) + 2;
      
      doc.setFont("helvetica", "bold"); doc.text("Transporte y Movilidad:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitTra = doc.splitTextToSize(f2.transporte, 188); doc.text(splitTra, col1, lineY); lineY += (splitTra.length * 5) + 2;

      doc.setFont("helvetica", "bold"); doc.text("Contexto Interior (Mobiliario):", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitMob = doc.splitTextToSize(f2.mobiliario, 188); doc.text(splitMob, col1, lineY); lineY += (splitMob.length * 5) + 5;

      controlSaltoHoja(40);
      tituloSeccion("8. ANTECEDENTES Y GRUPOS DE APOYO (Psicología)");
      doc.text(`Refiere consumo de adicciones: ${f1.adicciones}`, col1, lineY); lineY += 5;
      const splitAdicc = doc.splitTextToSize(`Detalle referenciado: ${f1.detalleAdicciones}`, 188);
      doc.text(splitAdicc, col1, lineY); lineY += (splitAdicc.length * 5) + 2;
      doc.text(`¿Ha recibido Terapias?: ${f1.terapias}`, col1, lineY); 
      doc.text(`¿Asiste a Grupos AA/Apoyo?: ${f1.gruposAA} (${f1.detalleGruposAA})`, col2, lineY); lineY += 10;

      controlSaltoHoja(60);
      tituloSeccion("9. DICTAMEN DE TRABAJO SOCIAL");
      doc.setFont("helvetica", "bold"); doc.text("Opinión sobre viabilidad y pertinencia al Programa:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitOpi = doc.splitTextToSize(f2.opinionPrograma, 188); doc.text(splitOpi, col1, lineY); lineY += (splitOpi.length * 5) + 6;

      doc.setFont("helvetica", "bold"); doc.text("Diagnóstico Criminológico/Social General:", col1, lineY); lineY += 5; doc.setFont("helvetica", "normal");
      const splitDiag = doc.splitTextToSize(f2.diagnostico, 188); doc.text(splitDiag, col1, lineY); lineY += (splitDiag.length * 5) + 15;

      // ======== FIRMAS ========
      controlSaltoHoja(40);
      lineY += 15;
      doc.line(70, lineY, 140, lineY);
      doc.text("Firma o Sello del Trabajador(a) Social", 105, lineY + 6, { align: "center" });
      doc.setFontSize(8);
      doc.text("Programa Reconecta con la Paz", 105, lineY + 11, { align: "center" });

      doc.save(`Estudio_Cívico_TS_${this.datosF1?.nombre || 'Expediente'}.pdf`);

      this.generandoPDF = false;
    } catch(e) {
      console.error(e);
      alert("Error crítico al componer PDF de Trabajo Social.");
      this.generandoPDF = false;
    }
  }
}
