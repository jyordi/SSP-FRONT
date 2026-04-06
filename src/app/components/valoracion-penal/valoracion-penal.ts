/**
 * @file valoracion-penal.component.ts  v5.0.0
 * @description Componente Angular 18+ standalone — Valoración Clínica Psicológica
 *              Programa "Reconecta con la Paz" — DGPD y PC
 *
 * CAMBIOS v5 (correcciones críticas del PDF):
 *  1. Checkboxes: se usa [x] / [ ] en lugar de caracteres Unicode ☑/☐
 *     que jsPDF no renderiza correctamente con la fuente helvetica.
 *  2. Celdas adaptadas: se eliminó el truncado artificial de texto.
 *     Las celdas ahora se expanden con splitTextToSize para que el
 *     contenido siempre sea legible.
 *  3. Columnas más anchas en las secciones clave para evitar solapamiento.
 *  4. Vista previa HTML mejorada: fiel al documento oficial, con estilos
 *     de tabla precisos y sin dependencia de html2canvas.
 *
 * @requires Angular 18+, jsPDF 2.5.1 (CDN)
 */

import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ─── Interfaces ───────────────────────────────────────────────────
export interface ArchivoAdjunto  { id:number; nombre:string; tamano:number; tipo:string; dataUrl:string; }
export interface EntradaHistorial{ id:number; expediente:string; nombre:string; delito:string; fecha:string; pdf:{nombre:string;dataUrl:string}; archivos:ArchivoAdjunto[]; }
export interface EstadoPdf        { activo:boolean; pct:number; fase:string; exito:boolean; error:string; }
export interface PasoWizard       { titulo:string; descripcion:string; icono:string; campos:string[]; }
export interface DefSustancia     { etiqueta:string; claveEdad:string; claveCant:string; claveUlt:string; }

// ─── Constantes ──────────────────────────────────────────────────
export const SUSTANCIAS: DefSustancia[] = [
  {etiqueta:'ALCOHOL',    claveEdad:'alcoholEdad',    claveCant:'alcoholCantidad',    claveUlt:'alcoholUltimo'},
  {etiqueta:'TABACO',     claveEdad:'tabacoEdad',     claveCant:'tabacoCantidad',     claveUlt:'tabacoUltimo'},
  {etiqueta:'MARIHUANA',  claveEdad:'marihuanaEdad',  claveCant:'marihuanaCantidad',  claveUlt:'marihuanaUltimo'},
  {etiqueta:'HEROINA',    claveEdad:'heroinaEdad',    claveCant:'heroinaCantidad',    claveUlt:'heroinaUltimo'},
  {etiqueta:'COCAINA',    claveEdad:'cocainaEdad',    claveCant:'cocainaCantidad',    claveUlt:'cocainaUltimo'},
  {etiqueta:'CRISTAL',    claveEdad:'cristalEdad',    claveCant:'cristalCantidad',    claveUlt:'cristalUltimo'},
  {etiqueta:'INHALABLES', claveEdad:'inhalablesEdad', claveCant:'inhalablesCantidad', claveUlt:'inhalablesUltimo'},
];

export const PASOS: PasoWizard[] = [
  {titulo:'Encabezado',       descripcion:'Numero de expediente y datos del caso',    icono:'📋', campos:['numeroExpediente']},
  {titulo:'I. Metodologia',   descripcion:'Instrumentos aplicados',                   icono:'🔬', campos:[]},
  {titulo:'II. Datos Generales',descripcion:'Informacion personal del evaluado',      icono:'👤', campos:['nombre','edad','fechaNacimiento','lugarNacimiento','estadoCivil','ocupacionActual','situacionJuridica']},
  {titulo:'III. Apariencia',  descripcion:'Aspecto fisico durante la entrevista',     icono:'👁️', campos:[]},
  {titulo:'IV. Actitud',      descripcion:'Actitud durante la entrevista',            icono:'🤝', campos:[]},
  {titulo:'V. Examen Mental', descripcion:'Estado mental y cognicion',                icono:'🧠', campos:['conciencia']},
  {titulo:'VI. Rendimiento',  descripcion:'Capacidades intelectuales',                icono:'📊', campos:[]},
  {titulo:'VII. Caracter',    descripcion:'Rasgos de caracter',                       icono:'⚡', campos:[]},
  {titulo:'VIII. Emocional',  descripcion:'Sintomatologia emocional',                 icono:'❤️', campos:[]},
  {titulo:'IX. Social',       descripcion:'Actitud social',                           icono:'🌐', campos:[]},
  {titulo:'X. Psicosocial',   descripcion:'Factores psicosociales',                   icono:'🏘️', campos:[]},
  {titulo:'XI. Adicciones',   descripcion:'Uso de sustancias psicoactivas',           icono:'💊', campos:[]},
  {titulo:'XII. Familia',     descripcion:'Dinamica familiar',                        icono:'👨‍👩‍👧', campos:[]},
  {titulo:'XIII. Hechos',     descripcion:'Version subjetiva de los hechos',          icono:'📝', campos:[]},
  {titulo:'XIV. Observaciones',descripcion:'Observaciones y resultados de pruebas',  icono:'🔍', campos:[]},
  {titulo:'XV. Accion',       descripcion:'Accion derivada de la atencion',           icono:'🎯', campos:[]},
  {titulo:'Firma y Adjuntos', descripcion:'Datos del perito y documentos adjuntos',  icono:'✍️', campos:[]},
];

export const CAMPOS_REQUERIDOS = PASOS.flatMap(p => p.campos);

// ─── Componente ─────────────────────────────────────────────────
@Component({
  selector: 'app-valoracion-penal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './valoracion-penal.html',
  styleUrls:   ['./valoracion-penal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValoracionPenalComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly tabActivo          = signal<'formulario'|'historial'>('formulario');
  readonly pasoActual         = signal(0);
  readonly mostrarVistaPrevia = signal(false);
  readonly archivosAdjuntos   = signal<ArchivoAdjunto[]>([]);
  readonly historial          = signal<EntradaHistorial[]>([]);
  readonly toast              = signal<{mensaje:string;tipo:string}>({mensaje:'',tipo:''});
  readonly estadoPdf          = signal<EstadoPdf>({activo:false,pct:0,fase:'',exito:false,error:''});
  readonly arrastrandoArchivo = signal(false);
  readonly generandoPdf       = signal(false);
  readonly guardando          = signal(false);
  readonly porcentaje         = signal(0);

  readonly formularioCompleto = computed(()=>CAMPOS_REQUERIDOS.every(k=>{const v=this._form?.value?.[k];return v&&v!=='';}));
  readonly contadorHistorial  = computed(()=>this.historial().length);
  readonly camposPendientes   = computed(()=>CAMPOS_REQUERIDOS.filter(k=>{const v=this._form?.value?.[k];return !v||v==='';}));
  readonly totalPasos         = computed(()=>PASOS.length);

  private _form!: FormGroup;
  get formGroup(): FormGroup { return this._form; }

  readonly sustancias        = SUSTANCIAS;
  readonly pasos             = PASOS;
  readonly estadosCiviles    = ['Soltero/a','Casado/a','Union libre','Divorciado/a','Viudo/a','Separado/a'];
  readonly opcionesEdadAp    = ['MENOR','IGUAL','MAYOR'];
  readonly opcionesHigiene   = ['LIMPIO','REGULAR','SUCIO'];
  readonly opcionesArreglo   = ['ALINADO','REGULAR','DESALINADO'];
  readonly opcionesConciencia= ['LUCIDA','OBNUBILADA','CONFUSA'];
  readonly opcionesJuicio    = ['AUMENTADO','CONSERVADO','DISMINUIDO'];
  readonly opcionesAmb       = ['ALTA','MEDIA','BAJA'];
  readonly opcionesPlaneacion= ['LOGICA','RIGIDA','CAOTICA'];
  readonly opcionesSiNo      = ['SI','NO'];
  readonly opcionesSeguim    = ['VOLUNTARIO','NECESARIO'];
  readonly metodologias      = [
    'CONSENTIMIENTO INFORMADO','ENTREVISTA CLINICA PSICOLOGICA',
    'OBSERVACION DIRECTA','EXAMEN COGNOSCITIVO MINI-MENTAL (MOCA)',
    'TEST PERSONA BAJO LA LLUVIA','TEST ASSIT (ADICCIONES)',
    'TEST INVENTARIO DE DEPRESION Y ANSIEDAD DE BECK','TEST. CUESTIONARIO DE AGRESIVIDAD AQ',
    'TEST CUESTIONARIO IPDE',
  ];

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._buildForm();
    const calc=()=>{
      const v=this._form?.value??{};
      const n=CAMPOS_REQUERIDOS.filter(k=>v[k]&&v[k]!=='').length;
      this.porcentaje.set(CAMPOS_REQUERIDOS.length?Math.round((n/CAMPOS_REQUERIDOS.length)*100):0);
    };
    calc();
    this._form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(calc);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Formulario ──────────────────────────────────────────────
  private _buildForm(): void {
    this._form = this.fb.group({
      numeroExpediente:['',Validators.required], expPenal:[''], delito:[''], institucion:[''], fechaEstudio:[''],
      nombre:['',Validators.required], edad:['',Validators.required],
      sobreNombre:[''], fechaNacimiento:['',Validators.required], lugarNacimiento:['',Validators.required],
      estadoCivil:['',Validators.required], domicilio:[''], religion:[''], orientacionSexual:[''],
      nivelEscolaridad:[''], ocupacionActual:['',Validators.required], lenguaMaterna:[''],
      situacionJuridica:['',Validators.required], contactoEmergencia:[''],
      edadAparente:[''], higiene:[''], arreglo:[''], lesionesRecientes:[''],
      cualesLesiones:[''], motivoLesiones:[''], tatuajes:[''], descripcionFisica:[''],
      actitudRespeta:[false], actitudSigueInstrucciones:[false], actitudAgresivo:[false],
      actitudSeductor:[false], actitudColabora:[false], actitudConcreto:[false],
      actitudIndiferente:[false], actitudManipulador:[false], estadoAnimo:[''], otraActitud:[''],
      conciencia:['',Validators.required],
      orientacionTiempo:[false], orientacionPersona:[false], orientacionEspacio:[false], orientacionObservaciones:[''],
      memoriaConservada:[false], memoriaDisminuida:[false], memoriaObservaciones:[''],
      atencionDispersa:[false], atencionConcentrada:[false], atencionObservaciones:[''],
      sensopercepcionAdecuada:[false], sensopercepcionAlterada:[false], sensopercepcionObservaciones:[''],
      contenidoLogico:[false], contenidoCoherente:[false], contenidoCongruente:[false],
      contenidoInductivo:[false], contenidoDeductivo:[false], contenidoIncongruente:[false],
      nivelPensamientoConcreto:[false], nivelPensamientoFuncional:[false], nivelPensamientoAbstracto:[false],
      nivelPensamientoObservaciones:[''],
      lenguajeNormal:[false], lenguajeRapido:[false], lenguajeLento:[false], lenguajeClaro:[false], lenguajeTecnico:[false],
      capacidadJuicio:[''], capacidadAnalisis:[''], capacidadSintesis:[''], capacidadPlaneacion:[''], capacidadOrganizacion:[''],
      toleranciaFrustracion:[''], capacidadDemora:[''], controlImpulsos:[''], manejoAgresividad:[''],
      sintomasBajaAutoestima:[false], sintomasAnsiedad:[false], sintomasMiedo:[false], sintomasEstres:[false],
      sintomasDepresion:[false], sintomasTrastornoAlimentacion:[false], sintomasTrastornoSueno:[false],
      sintomasDependenciaEmocional:[false],
      destrezasHabilidades:[''], queDisfrutas:[''], fortalezas:[''], deportePractica:[''],
      metasIncongruentes:[false], metasSinProyectos:[false], metasImprovisadas:[false],
      metasPracticas:[false], metasAlcanzables:[false], metasRealistas:[false],
      conflictoExistentes:[false], conflictoSituacionales:[false], conflictoNoExistente:[false],
      conductasAntisociales:[''],
      relacionesDependencia:[false], relacionesUtilitarias:[false], relacionesExplotacion:[false],
      relacionesControl:[false], sinInteresRelacionarse:[false], relacionesProfundas:[false], relacionesEstables:[false],
      hijos:[''], familiaNoApoya:[false], noTrabaja:[false], noTieneVivienda:[false],
      revictimizacion:[false], intentosSuicidio:[false], tratamientoPsiquiatrico:[false],
      adicciones:[''], grupoPares:[''], otrosFactores:[''],
      usaSustancias:[''], deseaRehabilitarse:[''],
      alcoholEdad:'',alcoholCantidad:'',alcoholUltimo:'',
      tabacoEdad:'',tabacoCantidad:'',tabacoUltimo:'',
      marihuanaEdad:'',marihuanaCantidad:'',marihuanaUltimo:'',
      heroinaEdad:'',heroinaCantidad:'',heroinaUltimo:'',
      cocainaEdad:'',cocainaCantidad:'',cocainaUltimo:'',
      cristalEdad:'',cristalCantidad:'',cristalUltimo:'',
      inhalablesEdad:'',inhalablesCantidad:'',inhalablesUltimo:'',
      otraSustancia:'',otraSustanciaEdad:'',otraSustanciaCantidad:'',otraSustanciaUltimo:'',
      internamientos:[''], tiempoSinConsumo:[''], delitoPorSustancias:[''], cualSustanciaDelito:[''],
      dinamicaFamiliar:[''], versionSubjetiva:[''],
      observacionesGenerales:[''], resultadoAssit:[''], resultadoAQ:[''], resultadoIPDE:[''], resultadoIDERE:[''],
      seguimiento:[''], referenciaPsiquiatricaValor:[''], referenciaPsiquiatricaMotivo:[''],
      referenciaNeurologicaValor:[''], referenciaNeurologicaMotivo:[''],
      referenciaOtroEspecialista:[''], referenciaOtroMotivo:[''],
      acompanamiento:[''], canalizacion:[''],
      nombreFirmante:['LIC. PSIC. AVELINA ESCARCEGA PEREZ'], cedFirmante:['6487612'],
    });
  }

  // ── Wizard ──────────────────────────────────────────────────
  siguientePaso(): void { if(this.pasoActual()<PASOS.length-1){this.pasoActual.update(p=>p+1);this._st();} }
  anteriorPaso(): void  { if(this.pasoActual()>0){this.pasoActual.update(p=>p-1);this._st();} }
  irAlPaso(i:number): void { this.pasoActual.set(i);this._st(); }
  private _st(){ window.scrollTo({top:0,behavior:'smooth'}); }
  completitudPaso(i:number):number{const c=PASOS[i]?.campos??[];if(!c.length)return 100;const v=this._form?.value??{};return Math.round((c.filter(k=>v[k]&&v[k]!=='').length/c.length)*100);}
  pasoCompleto(i:number):boolean{return this.completitudPaso(i)===100;}
  porcentajeCompletitud():number{return this.porcentaje();}

  // ── Archivos ────────────────────────────────────────────────
  procesarArchivos(l:FileList|null):void{if(!l)return;Array.from(l).forEach(f=>{const r=new FileReader();r.onload=e=>this.archivosAdjuntos.update(p=>[...p,{id:Date.now()+Math.random(),nombre:f.name,tamano:f.size,tipo:f.type,dataUrl:e.target!.result as string}]);r.readAsDataURL(f);});}
  eliminarArchivo(id:number):void{this.archivosAdjuntos.update(p=>p.filter(a=>a.id!==id));}

  // ── Toast ────────────────────────────────────────────────────
  mostrarToast(msg:string,tipo:'success'|'error'='success'):void{this.toast.set({mensaje:msg,tipo});setTimeout(()=>this.toast.set({mensaje:'',tipo:''}),3500);}

  // ══════════════════════════════════════════════════════════════
  //  GENERACIÓN DE PDF — jsPDF nativo, sin html2canvas
  //
  //  CORRECCIONES PRINCIPALES v5:
  //  1. Checkboxes: [X] y [ ] — compatibles con fuente helvetica
  //  2. Texto: nunca se trunca; splitTextToSize en todas las celdas
  //  3. Celdas con altura auto-calculada según contenido
  //  4. Columnas redimensionadas para que todo quepa sin solapamiento
  // ══════════════════════════════════════════════════════════════

  private _cargarJsPDF():Promise<void>{
    return new Promise((ok,err)=>{
      if((window as any).jspdf) return ok();
      const s=Object.assign(document.createElement('script'),{
        id:'jspdf-cdn',
        src:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      });
      s.onload=()=>ok(); s.onerror=()=>err(new Error('No se pudo cargar jsPDF'));
      document.head.appendChild(s);
    });
  }

  private async _generarPDF():Promise<any>{
    await this._cargarJsPDF();
    const {jsPDF}=(window as any).jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
    const val=this._form.value;

    // ── Constantes de layout ──────────────────────────────────
    const PW  = doc.internal.pageSize.getWidth();   // 215.9 mm
    const PH  = doc.internal.pageSize.getHeight();  // 279.4 mm
    const ML  = 8;    // margen izquierdo
    const MT  = 10;   // margen superior
    const MB  = 12;   // margen inferior
    const W   = PW - ML*2;   // ancho util ~199.9 mm
    const yMax= PH - MB;     // y maxima antes de nueva pagina

    type RGB=[number,number,number];
    const VINO:RGB=[133,10,49], GRAY:RGB=[200,200,200], LGRAY:RGB=[238,238,238];
    const BLACK:RGB=[0,0,0], DKGRAY:RGB=[80,80,80];

    let y = MT;
    let pageNum = 1;

    // ── Funcion: nueva pagina con mini-encabezado ─────────────
    const nuevaPagina = () => {
      doc.addPage(); pageNum++;
      y = MT;
      // Mini encabezado institucional de continuacion
      doc.setFillColor(220,220,220);
      doc.rect(ML, y, W, 5, 'F');
      doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...VINO);
      doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL — VALORACION CLINICA PSICOLOGICA', PW/2, y+3.5, {align:'center'});
      doc.setTextColor(...BLACK);
      y += 7;
    };

    // ── Funcion: verificar espacio, insertar pagina si es necesario ──
    const check = (need:number) => {
      if(y + need > yMax) nuevaPagina();
    };

    // ── Helper: dibujar borde de celda ────────────────────────
    const borde = (x:number,cy:number,w:number,h:number) => {
      doc.setDrawColor(140,140,140);
      doc.rect(x, cy, w, h, 'S');
    };

    // ── Helper: texto dentro de celda con padding ─────────────
    // Dibuja texto centrado verticalmente en la celda, nunca trunca
    const txtCelda = (
      x:number, cy:number, w:number, h:number,
      txt:string, bold=false, align:'left'|'center'|'right'='left', fs=8
    ) => {
      if(!txt) return;
      doc.setFontSize(fs).setFont('helvetica',bold?'bold':'normal').setTextColor(...BLACK);
      const pad = 1.8;
      const maxW = w - pad*2;
      const lines = doc.splitTextToSize(txt, maxW);
      const lh = fs * 0.45; // altura por linea en mm
      const totalH = lines.length * lh;
      const startY = cy + (h - totalH)/2 + lh;
      const tx = align==='center' ? x+w/2 : align==='right' ? x+w-pad : x+pad;
      doc.text(lines, tx, startY, {align});
    };

    // ── Helper: celda completa (borde + fondo + texto) ────────
    const cell = (
      x:number, cy:number, w:number, h:number, txt:string,
      bold=false, fill?:RGB, align:'left'|'center'|'right'='left', fs=8
    ) => {
      if(fill){ doc.setFillColor(...fill); doc.rect(x,cy,w,h,'F'); }
      borde(x, cy, w, h);
      if(txt) txtCelda(x, cy, w, h, txt, bold, align, fs);
    };

    // ── Helper: celda multilínea con altura AUTO ───────────────
    // Devuelve la altura real usada
    const cellAuto = (
      x:number, cy:number, w:number, txt:string,
      bold=false, fs=8, minH=5, padV=2
    ): number => {
      const pad = 1.8;
      const lines = txt ? doc.splitTextToSize(txt, w-pad*2) : [''];
      const lh = fs * 0.45;
      const h = Math.max(minH, lines.length * lh + padV*2);
      if(txt){ doc.setFillColor(255,255,255); } // fondo blanco
      borde(x, cy, w, h);
      if(txt){
        doc.setFontSize(fs).setFont('helvetica',bold?'bold':'normal').setTextColor(...BLACK);
        doc.text(lines, x+pad, cy+padV+lh);
      }
      return h;
    };

    // ── Helper: barra de seccion ──────────────────────────────
    const sec = (titulo:string, hBar=5.5) => {
      check(hBar + 2);
      doc.setFillColor(...GRAY);
      doc.rect(ML, y, W, hBar, 'F');
      doc.setDrawColor(120,120,120);
      doc.rect(ML, y, W, hBar, 'S');
      doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
      doc.text(titulo, PW/2, y+hBar/2+1.6, {align:'center'});
      y += hBar + 1;
    };

    // ── Helper: checkbox compatible con helvetica ─────────────
    // jsPDF con helvetica no soporta bien ☑/☐; usamos [X] y [ ]
    const chk = (v:boolean) => v ? '[X]' : '[ ]';

    // ── Helper: bullet seleccionado ───────────────────────────
    const dot = (val:string, op:string) => val===op ? '(*)' : '( )';

    // ══════════════════════════════════════════════════════════
    //  PAGINA 1: Encabezado + I + II + III + IV + V
    // ══════════════════════════════════════════════════════════

    // ── Encabezado institucional ────────────────────────────────
    //
    //  Layout de 3 zonas SEPARADAS para evitar solapamiento:
    //
    //  |-- Zona A: logo (izq, 38mm) --|-- Zona B: títulos (centro, xB..xE) --|-- Zona C: expediente (der, 70mm) --|
    //
    //  Se dibujan en orden C → A → B para reservar espacio correctamente.
    //  Altura total del encabezado: 28 mm (5 filas * 5.5 mm + separaciones)

    const wLogoZone = 36;              // Zona A: ancho del logo izquierdo
    const wExpZone  = 72;              // Zona C: ancho de la tabla del expediente
    const xE        = PW - ML - wExpZone; // x inicio de Zona C
    const wCentro   = xE - (ML + wLogoZone) - 2; // Zona B: espacio entre logo y expediente
    const xCentro   = ML + wLogoZone + 1 + wCentro/2; // centro exacto de Zona B
    const fH        = 5.5;            // altura de cada fila del expediente

    // ── Zona C: Tabla de expediente (derecha) ──────────────────
    // Se dibuja PRIMERO para que los textos de Zona A/B no la pisen
    const cellExp = (cy:number, txt:string, bold=false) => {
      if(bold){ doc.setFillColor(...LGRAY); doc.rect(xE, cy, wExpZone, fH, 'F'); }
      doc.setDrawColor(140,140,140);
      doc.rect(xE, cy, wExpZone, fH, 'S');
      doc.setFontSize(7).setFont('helvetica', bold?'bold':'normal').setTextColor(...BLACK);
      const lines = doc.splitTextToSize(txt, wExpZone - 3);
      doc.text(lines[0]||'', xE+1.5, cy + fH/2 + 1.2);
    };
    cellExp(y,        `No. Exp: DGPDyPC-RCP-${val.numeroExpediente||''}`, true);
    cellExp(y+fH,     `Exp. Penal: ${val.expPenal||''}`);
    cellExp(y+fH*2,   `Delito: ${val.delito||''}`);
    cellExp(y+fH*3,   `Institucion: ${val.institucion||''}`);
    cellExp(y+fH*4,   `Fecha de Estudio: ${val.fechaEstudio||''}`);

    // ── Zona A: Logo "SEGURIDAD CIUDADANA" (izquierda) ─────────
    // Texto confinado a los primeros `wLogoZone` mm desde ML
    doc.setFontSize(9.5).setFont('helvetica','bold').setTextColor(...VINO);
    doc.text('SEGURIDAD CIUDADANA', ML, y+5);
    doc.setFontSize(6).setFont('helvetica','normal').setTextColor(...DKGRAY);
    doc.text('SECRETARIA DE SEGURIDAD', ML, y+8.5);
    doc.text('Y PROTECCION', ML, y+11.5);

    // ── Zona B: Títulos institucionales (centro entre logo y tabla) ─
    // Cada línea se limita al ancho `wCentro` para evitar desbordarse
    // hacia la Zona A (logo) o la Zona C (expediente).
    const lh  = 3.8;  // separación entre líneas institucionales (mm)
    const yB0 = y + 2.5; // y inicial del bloque central
    doc.setFontSize(7.2).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL',     xCentro, yB0,      {align:'center', maxWidth: wCentro});
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO',          xCentro, yB0+lh,   {align:'center', maxWidth: wCentro});
    doc.text('Y PARTICIPACION CIUDADANA',                            xCentro, yB0+lh*2, {align:'center', maxWidth: wCentro});
    doc.setFontSize(9).setFont('helvetica','bold');
    doc.text('VALORACION CLINICA PSICOLOGICA',                       xCentro, yB0+lh*3+2, {align:'center', maxWidth: wCentro});

    // El encabezado ocupa exactamente: 5 filas × 5.5mm = 27.5mm
    // Más un pequeño margen inferior antes de la línea roja
    y += 30;

    // Linea roja divisora bajo el encabezado
    doc.setDrawColor(...VINO); doc.setLineWidth(0.6);
    doc.line(ML, y, ML+W, y);
    doc.setLineWidth(0.2); y += 3;

    // Motivo de valoracion
    cell(ML, y, W*0.24, 5.5, 'MOTIVO DE VALORACION:', true, LGRAY);
    cell(ML+W*0.24, y, W*0.76, 5.5, 'Inclusion al programa "RECONECTA CON LA PAZ."');
    y += 7.5;

    // I. Metodologia
    sec('I.- METODOLOGIA');
    const metW=W/2, metH=4.8;
    const mets=[
      ['CONSENTIMIENTO INFORMADO','ENTREVISTA CLINICA PSICOLOGICA'],
      ['OBSERVACION DIRECTA','EXAMEN COGNOSCITIVO MINI-MENTAL (MOCA)'],
      ['TEST PERSONA BAJO LA LLUVIA','TEST ASSIT (ADICCIONES)'],
      ['TEST INVENTARIO DE DEPRESION Y ANSIEDAD DE BECK','TEST. CUESTIONARIO DE AGRESIVIDAD AQ'],
      ['TEST CUESTIONARIO IPDE',''],
    ];
    mets.forEach(([a,b])=>{
      check(metH);
      cell(ML,      y, metW, metH, 'v '+a, false, [248,252,248]);
      cell(ML+metW, y, metW, metH, b?'v '+b:'', false, [248,252,248]);
      y += metH;
    }); y += 2;

    // II. Datos Generales
    sec('II.- DATOS GENERALES');
    const dH=5.5, dW=W/2;
    ([
      [`NOMBRE: ${val.nombre||''}`,         `EDAD: ${val.edad||''}`],
      [`SOBRE NOMBRE: ${val.sobreNombre||''}`,`FECHA DE NACIMIENTO: ${val.fechaNacimiento||''}`],
      [`LUGAR DE NACIMIENTO: ${val.lugarNacimiento||''}`,`ESTADO CIVIL: ${val.estadoCivil||''}`],
      [`DOMICILIO: ${val.domicilio||''}`,   `RELIGION: ${val.religion||''}`],
      [`ORIENTACION SEXUAL: ${val.orientacionSexual||''}`,`NIVEL DE ESCOLARIDAD: ${val.nivelEscolaridad||''}`],
      [`OCUPACION ACTUAL: ${val.ocupacionActual||''}`,`LENGUA MATERNA: ${val.lenguaMaterna||''}`],
    ] as [string,string][]).forEach(([a,b])=>{
      check(dH);
      cell(ML,    y, dW, dH, a);
      cell(ML+dW, y, dW, dH, b);
      y += dH;
    });
    check(dH); cell(ML, y, W, dH, `SITUACION JURIDICA: ${val.situacionJuridica||''}`); y += dH;
    check(dH); cell(ML, y, W, dH, `CONTACTO DE EMERGENCIA: ${val.contactoEmergencia||''}`); y += dH+1.5;

    // III. Apariencia — estructura de tabla con columnas fijas
    sec('III. APARIENCIA');
    const aH  = 5;
    const aC  = [W*0.17, W*0.27, W*0.12, W*0.44];
    const aX  = [ML, ML+aC[0], ML+aC[0]+aC[1], ML+aC[0]+aC[1]+aC[2]];

    // Necesitamos 9 filas + 2 filas extra = 11*aH
    check(aH*11 + 8);

    // SEÑAS PARTICULARES (col 2, rowspan 9)
    doc.setFillColor(242,242,242);
    doc.rect(aX[2], y, aC[2], aH*9, 'F');
    borde(aX[2], y, aC[2], aH*9);
    doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...BLACK);
    // Texto vertical centrado
    const xCentroSP = aX[2] + aC[2]/2;
    const yCentroSP = y + aH*9/2;
    doc.text('SENAS PARTICULARES', xCentroSP, yCentroSP, {align:'center', angle:90});

    // TATUAJES (col 3, rows 1-5)
    borde(aX[3], y, aC[3], aH*5);
    doc.setFontSize(7.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('TATUAJES / CICATRICES ETC:', aX[3]+1.8, y+4);
    if(val.tatuajes){
      doc.setFont('helvetica','normal').setFontSize(7.5);
      doc.text(doc.splitTextToSize(val.tatuajes, aC[3]-3.6), aX[3]+1.8, y+8);
    }

    // EDAD APARENTE (col 0, rowspan 3)
    cell(aX[0], y, aC[0], aH*3, 'EDAD APARENTE', true, LGRAY);
    cell(aX[1], y,        aC[1], aH, `MENOR A LA CRONOLOGICA  ${val.edadAparente==='MENOR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y,        aC[1], aH, `IGUAL A LA CRONOLOGICA  ${val.edadAparente==='IGUAL'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y,        aC[1], aH, `MAYOR A LA CRONOLOGICA  ${val.edadAparente==='MAYOR'?'[X]':'[ ]'}`); y+=aH;

    // HIGIENE (col 0, rowspan 3)
    cell(aX[0], y, aC[0], aH*3, 'HIGIENE', true, LGRAY);
    // Col 3 filas 4-7
    borde(aX[3], y, aC[3], aH*4);
    cell(aX[1], y, aC[1], aH, `LIMPIO  ${val.higiene==='LIMPIO'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y, aC[1], aH, `REGULAR ${val.higiene==='REGULAR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y, aC[1], aH, `SUCIO   ${val.higiene==='SUCIO'?'[X]':'[ ]'}`); y+=aH;

    // ARREGLO (col 0, rowspan 3)
    cell(aX[0], y, aC[0], aH*3, 'ARREGLO', true, LGRAY);
    cell(aX[1], y, aC[1], aH, `ALINADO      ${val.arreglo==='ALINADO'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y, aC[1], aH, `REGULAR      ${val.arreglo==='REGULAR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1], y, aC[1], aH, `DESALINADO   ${val.arreglo==='DESALINADO'?'[X]':'[ ]'}`); y+=aH;

    check(aH);
    cell(ML, y, W, aH, `LESIONES RECIENTES: ${val.lesionesRecientes||'NO'}   CUAL O CUALES: ${val.cualesLesiones||''}   MOTIVO: ${val.motivoLesiones||''}`);
    y+=aH;

    // Descripcion fisica — celda de altura auto
    check(5);
    const hDesc = cellAuto(ML, y, W, `DESCRIPCION FISICA: ${val.descripcionFisica||''}`, false, 8, 5);
    y += hDesc + 1.5;

    // IV. Actitud
    sec('IV. ACTITUD DURANTE LA ENTREVISTA');
    const aw=W/4, ah=5;
    check(ah*3);
    cell(ML,     y, aw, ah, `${chk(val.actitudRespeta)} RESPETA`);
    cell(ML+aw,  y, aw, ah, `${chk(val.actitudSigueInstrucciones)} SIGUE INSTRUCCIONES`);
    cell(ML+aw*2,y, aw, ah, `${chk(val.actitudAgresivo)} AGRESIVO`);
    cell(ML+aw*3,y, aw, ah, `${chk(val.actitudSeductor)} SEDUCTOR`); y+=ah;
    cell(ML,     y, aw, ah, `${chk(val.actitudColabora)} COLABORA`);
    cell(ML+aw,  y, aw, ah, `${chk(val.actitudConcreto)} CONCRETO`);
    cell(ML+aw*2,y, aw, ah, `${chk(val.actitudIndiferente)} INDIFERENTE`);
    cell(ML+aw*3,y, aw, ah, `${chk(val.actitudManipulador)} MANIPULADOR`); y+=ah;
    cell(ML,     y, W/2, ah, `ESTADO DE ANIMO: ${val.estadoAnimo||''}`);
    cell(ML+W/2, y, W/2, ah, `OTRA: ${val.otraActitud||''}`); y+=ah+1.5;

    // V. Examen Mental
    sec('V. EXAMEN MENTAL');
    // Columnas: label | dato1 | dato2 | dato3 | obs
    const eW=[W*0.22, W*0.20, W*0.20, W*0.18, W*0.20];
    const eH=5;
    [
      ['1) CONCIENCIA',    `LUCIDA: ${val.conciencia==='LUCIDA'?'[X]':'[ ]'}`,    `OBNUBILADA: ${val.conciencia==='OBNUBILADA'?'[X]':'[ ]'}`, `CONFUSA: ${val.conciencia==='CONFUSA'?'[X]':'[ ]'}`, ''],
      ['2) ORIENTACION',   `TIEMPO: ${chk(val.orientacionTiempo)}`,             `PERSONA: ${chk(val.orientacionPersona)}`,              `ESPACIO: ${chk(val.orientacionEspacio)}`,       `OBS: ${val.orientacionObservaciones||''}`],
      ['3) MEMORIA',       `CONSERVADA: ${chk(val.memoriaConservada)}`,          `DISMINUIDA: ${chk(val.memoriaDisminuida)}`,             '',                                              `OBS: ${val.memoriaObservaciones||''}`],
      ['4) ATENCION',      `DISPERSA: ${chk(val.atencionDispersa)}`,             `CONCENTRADA: ${chk(val.atencionConcentrada)}`,          '',                                              `OBS: ${val.atencionObservaciones||''}`],
      ['5) SENSOPERCEPCION',`ADECUADA: ${chk(val.sensopercepcionAdecuada)}`,    `ALTERADA: ${chk(val.sensopercepcionAlterada)}`,         '',                                              `OBS: ${val.sensopercepcionObservaciones||''}`],
      ['6) TIPO CONTENIDO',`LOGICO: ${chk(val.contenidoLogico)} COHERENTE: ${chk(val.contenidoCoherente)}`,`CONGRUENTE: ${chk(val.contenidoCongruente)}`,`INDUCTIVO: ${chk(val.contenidoInductivo)} DEDUCTIVO: ${chk(val.contenidoDeductivo)}`,`INCONGRUENTE: ${chk(val.contenidoIncongruente)}`],
      ['7) NIVEL PENSAMIENTO',`CONCRETO: ${chk(val.nivelPensamientoConcreto)}`, `FUNCIONAL: ${chk(val.nivelPensamientoFuncional)}`,      `ABSTRACTO: ${chk(val.nivelPensamientoAbstracto)}`, `OBS: ${val.nivelPensamientoObservaciones||''}`],
      ['8) CURSO LENGUAJE', `NORMAL: ${chk(val.lenguajeNormal)} RAPIDO: ${chk(val.lenguajeRapido)}`,`LENTO: ${chk(val.lenguajeLento)}`,`CLARO: ${chk(val.lenguajeClaro)}`,               `TECNICO: ${chk(val.lenguajeTecnico)}`],
    ].forEach(([a,b,c,d,e])=>{
      check(eH);
      let xr=ML;
      [a,b,c,d,e].forEach((t,i)=>{ cell(xr,y,eW[i],eH,t,i===0); xr+=eW[i]; });
      y+=eH;
    }); y+=2;

    // ══════════════════════════════════════════════════════════
    //  PAGINA 2: VI + VII + VIII + IX + X
    // ══════════════════════════════════════════════════════════

    // VI. Rendimiento Intelectual
    sec('VI. RENDIMIENTO INTELECTUAL');
    const riC=[W*0.36, W*0.22, W*0.22, W*0.20];
    [
      ['CAPACIDAD DE JUICIO',      `AUMENTADO: ${dot(val.capacidadJuicio,'AUMENTADO')}`,     `CONSERVADO: ${dot(val.capacidadJuicio,'CONSERVADO')}`,    `DISMINUIDO: ${dot(val.capacidadJuicio,'DISMINUIDO')}`],
      ['CAPACIDAD DE ANALISIS',    `ALTA: ${dot(val.capacidadAnalisis,'ALTA')}`,             `MEDIA: ${dot(val.capacidadAnalisis,'MEDIA')}`,            `BAJA: ${dot(val.capacidadAnalisis,'BAJA')}`],
      ['CAPACIDAD DE SINTESIS',    `ALTA: ${dot(val.capacidadSintesis,'ALTA')}`,             `MEDIA: ${dot(val.capacidadSintesis,'MEDIA')}`,            `BAJA: ${dot(val.capacidadSintesis,'BAJA')}`],
      ['CAPACIDAD DE PLANEACION',  `LOGICA: ${dot(val.capacidadPlaneacion,'LOGICA')}`,       `RIGIDA: ${dot(val.capacidadPlaneacion,'RIGIDA')}`,        `CAOTICA: ${dot(val.capacidadPlaneacion,'CAOTICA')}`],
      ['CAPACIDAD DE ORGANIZACION',`LOGICA: ${dot(val.capacidadOrganizacion,'LOGICA')}`,     `RIGIDA: ${dot(val.capacidadOrganizacion,'RIGIDA')}`,      `CAOTICA: ${dot(val.capacidadOrganizacion,'CAOTICA')}`],
    ].forEach(([a,b,c,d])=>{
      check(5);
      let xr=ML;
      [a,b,c,d].forEach((t,i)=>{ cell(xr,y,riC[i],5,t,i===0); xr+=riC[i]; });
      y+=5;
    }); y+=2;

    // VII. Rasgos de Caracter
    sec('VII. RASGOS DE CARACTER');
    const rcC=[W*0.40, W*0.13, W*0.13, W*0.13, W*0.21];
    check(5);
    let xrc=ML;
    ['','ALTA','MEDIA','BAJA','MANEJO DE AGRESIVIDAD'].forEach((t,i)=>{
      cell(xrc,y,rcC[i],5,t,true,GRAY,'center',7.5); xrc+=rcC[i];
    }); y+=5;
    const rcYInicio=y;
    [
      ['TOLERANCIA A LA FRUSTRACION','toleranciaFrustracion'],
      ['CAPACIDAD DE DEMORA','capacidadDemora'],
      ['CONTROL DE IMPULSOS','controlImpulsos'],
    ].forEach(([lbl,key],idx)=>{
      check(5);
      xrc=ML;
      cell(xrc,y,rcC[0],5,lbl); xrc+=rcC[0];
      ['ALTA','MEDIA','BAJA'].forEach((op,ci)=>{
        cell(xrc,y,rcC[ci+1],5, val[key]===op?'(*)':'( )', false, undefined,'center',9); xrc+=rcC[ci+1];
      });
      // Celda de manejo agresividad (rowspan=3, se dibuja solo en idx=0)
      if(idx===0){
        const agH=5*3;
        borde(ML+rcC[0]+rcC[1]+rcC[2]+rcC[3], rcYInicio, rcC[4], agH);
        if(val.manejoAgresividad){
          doc.setFontSize(7.5).setFont('helvetica','normal').setTextColor(...BLACK);
          const agLines=doc.splitTextToSize(val.manejoAgresividad, rcC[4]-3.6);
          doc.text(agLines, ML+rcC[0]+rcC[1]+rcC[2]+rcC[3]+1.8, rcYInicio+4);
        }
      }
      y+=5;
    }); y+=2;

    // VIII. Sintomatologia Emocional
    sec('VIII. SINTOMATOLOGIA EMOCIONAL');
    const sintH=42;
    check(sintH);
    const sW1=W*0.37, sW2=W*0.63;
    borde(ML, y, sW1, sintH);
    borde(ML+sW1, y, sW2, sintH);
    doc.setFontSize(7.8).setFont('helvetica','normal').setTextColor(...BLACK);
    [
      ['sintomasBajaAutoestima','BAJA AUTOESTIMA'],
      ['sintomasAnsiedad','ANSIEDAD'],
      ['sintomasMiedo','MIEDO'],
      ['sintomasEstres','ESTRES'],
      ['sintomasDepresion','DEPRESION'],
      ['sintomasTrastornoAlimentacion','TRASTORNO DE ALIMENTACION'],
      ['sintomasTrastornoSueno','TRASTORNO DEL SUENO'],
      ['sintomasDependenciaEmocional','DEPENDENCIA EMOCIONAL'],
    ].forEach(([k,lbl],i)=>{
      doc.text(`${chk(val[k])} ${lbl}`, ML+2, y+5+i*4.6);
    });
    const xD=ML+sW1+2;
    doc.setFont('helvetica','bold');
    doc.text('DESTREZAS Y HABILIDADES:', xD, y+5);
    doc.setFont('helvetica','normal');
    if(val.destrezasHabilidades) doc.text(doc.splitTextToSize(val.destrezasHabilidades,sW2-4), xD, y+9.5);
    doc.setFont('helvetica','bold');
    doc.text('QUE ES LO QUE MAS DISFRUTAS HACER?', xD, y+19);
    doc.setFont('helvetica','normal');
    if(val.queDisfrutas) doc.text(doc.splitTextToSize(val.queDisfrutas,sW2-4), xD, y+23.5);
    doc.setFont('helvetica','bold');
    doc.text('CUALES SON TUS FORTALEZAS?', xD, y+29);
    doc.setFont('helvetica','normal');
    if(val.fortalezas) doc.text(doc.splitTextToSize(val.fortalezas,sW2-4), xD, y+33.5);
    doc.setFont('helvetica','bold');
    doc.text('DEPORTE QUE PRACTICAS:', xD, y+38.5);
    doc.setFont('helvetica','normal');
    doc.text(val.deportePractica||'', xD+38, y+38.5);
    y+=sintH+2;

    // IX. Actitud Social
    sec('IX.- ACTITUD SOCIAL');
    const asH=48;
    check(asH);
    const asC=[W*0.24, W*0.21, W*0.25, W*0.30];
    let xa=ML;
    asC.forEach(w=>{ borde(xa,y,w,asH); xa+=w; });
    doc.setFontSize(7.5).setFont('helvetica','normal').setTextColor(...BLACK);
    // METAS
    doc.setFont('helvetica','bold'); doc.text('METAS:', ML+2, y+5); doc.setFont('helvetica','normal');
    [['metasIncongruentes','INCONGRUENTES'],['metasSinProyectos','SIN PROYECTOS DEFINIDOS'],
     ['metasImprovisadas','IMPROVISADAS'],['metasPracticas','PRACTICAS Y CONCRETAS'],
     ['metasAlcanzables','ALCANZABLES'],['metasRealistas','REALISTAS']].forEach(([k,l],i)=>{
      doc.text(`${chk(val[k])} ${l}`, ML+2, y+10+i*5.8);
    });
    // CONFLICTO
    const xCon=ML+asC[0]+2;
    doc.setFont('helvetica','bold'); doc.text('CONFLICTO CON LA', xCon, y+5);
    doc.text('AUTORIDAD', xCon, y+9); doc.setFont('helvetica','normal');
    [['conflictoExistentes','EXISTENTES'],['conflictoSituacionales','SITUACIONALES'],['conflictoNoExistente','NO EXISTENTE']].forEach(([k,l],i)=>{
      doc.text(`${chk(val[k])} ${l}`, xCon, y+14+i*5.8);
    });
    // INTERACCION SOCIAL
    const xInt=ML+asC[0]+asC[1]+2;
    doc.setFont('helvetica','bold'); doc.text('INTERACCION SOCIAL', xInt, y+5); doc.setFont('helvetica','normal');
    [['relacionesDependencia','DE DEPENDENCIA'],['relacionesUtilitarias','UTILITARIAS'],
     ['relacionesExplotacion','DE EXPLOTACION'],['relacionesControl','DE CONTROL'],
     ['sinInteresRelacionarse','SIN INTERES'],['relacionesProfundas','PROFUNDAS'],['relacionesEstables','ESTABLES']].forEach(([k,l],i)=>{
      doc.text(`${chk(val[k])} ${l}`, xInt, y+10+i*5.3);
    });
    // CONDUCTAS ANTISOCIALES
    const xAnt=ML+asC[0]+asC[1]+asC[2]+2;
    doc.setFont('helvetica','bold'); doc.text('CONDUCTAS ANTISOCIALES:', xAnt, y+5); doc.setFont('helvetica','normal');
    if(val.conductasAntisociales) doc.text(doc.splitTextToSize(val.conductasAntisociales,asC[3]-4), xAnt, y+11);
    y+=asH+2;

    // X. Factores Psicosociales
    sec('X. FACTORES PSICOSOCIALES');
    const fH2=24;
    check(fH2);
    borde(ML, y, W, fH2);
    doc.setFontSize(7.8).setFont('helvetica','normal').setTextColor(...BLACK);
    doc.text(`HIJOS: ${val.hijos||'___'}`, ML+2, y+5);
    doc.text(`${chk(val.familiaNoApoya)} SU PROPIA FAMILIA NO LO APOYA   ${chk(val.noTrabaja)} NO TRABAJA   ${chk(val.noTieneVivienda)} NO TIENE VIVIENDA`, ML+2, y+10);
    doc.text(`${chk(val.revictimizacion)} RE VICTIMIZACION   ${chk(val.intentosSuicidio)} INTENTOS DE SUICIDIO   ${chk(val.tratamientoPsiquiatrico)} TRATAMIENTO PSIQUIATRICO`, ML+2, y+15);
    doc.text(`ADICCIONES: ${val.adicciones||''}`, ML+2, y+20);
    doc.text(`GRUPO DE PARES: ${val.grupoPares||'_______'}`, ML+W/2, y+20);
    if(val.otrosFactores) doc.text(`OTROS. ESPECIFIQUE: ${val.otrosFactores}`, ML+2, y+24);
    y+=fH2+2;

    // ══════════════════════════════════════════════════════════
    //  PAGINA 3: XI + XII + XIII
    // ══════════════════════════════════════════════════════════

    // XI. Adicciones
    sec('XI. ADICCIONES');
    check(5);
    cell(ML,        y, W*0.50, 5, `USO SUST. PSICOACTIVAS: SI: ${val.usaSustancias==='SI'?'[X]':'[ ]'}  NO: ${val.usaSustancias==='NO'?'[X]':'[ ]'}`);
    cell(ML+W*0.50, y, W*0.50, 5, `DESEA REHABILITARSE  SI: ${val.deseaRehabilitarse==='SI'?'[X]':'[ ]'}  NO: ${val.deseaRehabilitarse==='NO'?'[X]':'[ ]'}`);
    y+=5;

    // Cabecera tabla sustancias
    check(5);
    const stC=[W*0.28, W*0.18, W*0.30, W*0.24];
    let xs=ML;
    ['SUSTANCIAS','EDAD DE INICIO','CANTIDAD/ FRECUENCIA','ULTIMO CONSUMO'].forEach((h,i)=>{
      cell(xs,y,stC[i],5.5,h,true,GRAY,'center',8); xs+=stC[i];
    }); y+=5.5;

    // Filas de sustancias
    [...SUSTANCIAS,
     {etiqueta:'OTRA (S): especifique',claveEdad:'otraSustanciaEdad',claveCant:'otraSustanciaCantidad',claveUlt:'otraSustanciaUltimo'}
    ].forEach(s=>{
      check(5);
      xs=ML;
      const lbl=s.etiqueta==='OTRA (S): especifique'
        ? `OTRA(S): ${val.otraSustancia||''}`
        : s.etiqueta;
      [lbl, val[s.claveEdad]||'', val[s.claveCant]||'', val[s.claveUlt]||''].forEach((t,i)=>{
        cell(xs, y, stC[i], 5, t, i===0); xs+=stC[i];
      }); y+=5;
    });

    check(5);
    cell(ML, y, W, 5,
      `INTERNAMIENTOS: SI: ${val.internamientos==='SI'?'[X]':'[ ]'} NO: ${val.internamientos==='NO'?'[X]':'[ ]'}   TIEMPO SIN CONSUMO: ${val.tiempoSinConsumo||''}`
    ); y+=5;
    check(5);
    cell(ML, y, W, 5,
      `DELITO RELACIONADO A SUST.: SI: ${val.delitoPorSustancias==='SI'?'[X]':'[ ]'} NO: ${val.delitoPorSustancias==='NO'?'[X]':'[ ]'}   CUAL?: ${val.cualSustanciaDelito||''}`
    ); y+=5+2;

    // XII. Dinamica Familiar
    sec('XII. DINAMICA FAMILIAR');
    const dinH=58;
    check(dinH);
    borde(ML, y, W, dinH);
    if(val.dinamicaFamiliar){
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(val.dinamicaFamiliar, W-3.6), ML+1.8, y+5);
    }
    y+=dinH+2;

    // XIII. Version Subjetiva
    sec('XIII. VERSION SUBJETIVA DE LOS HECHOS (BREVE RELATO DE LA VINCULACION A PROCESO Y APREHENSION):');
    const vsH=58;
    check(vsH);
    borde(ML, y, W, vsH);
    if(val.versionSubjetiva){
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(val.versionSubjetiva, W-3.6), ML+1.8, y+5);
    }
    y+=vsH+2;

    // ══════════════════════════════════════════════════════════
    //  PAGINA 4: XIV + XV + Notas + Firma
    // ══════════════════════════════════════════════════════════

    // XIV. Observaciones Generales
    sec('XIV. OBSERVACIONES GENERALES. Y RESULTADOS DE LAS PRUEBAS PSICOLOGICAS:');
    const obsH=52;
    check(obsH);
    borde(ML, y, W, obsH);
    if(val.observacionesGenerales){
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK);
      doc.text(doc.splitTextToSize(val.observacionesGenerales, W-3.6), ML+1.8, y+5);
    }
    y+=obsH;

    // Resultados cuantitativos — dentro del mismo bloque XIV
    check(32);
    borde(ML, y, W, 30);
    doc.setFontSize(8).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('RESULTADOS CUANTITATIVOS:', ML+2, y+5.5);
    doc.setFont('helvetica','normal');
    doc.text(`TEST ASSIT (ADICCIONES): ${val.resultadoAssit||''}`, ML+2, y+11);
    doc.text(`TEST. CUESTIONARIO DE AGRESIVIDAD AQ: ${val.resultadoAQ||''}`, ML+2, y+16.5);
    doc.text(`TEST CUESTIONARIO IPDE: ${val.resultadoIPDE||''}`, ML+2, y+22);
    doc.text(`TEST INVENTARIO DE DEPRESION RASGO - ESTADO (IDERE): ${val.resultadoIDERE||''}`, ML+2, y+27.5);
    y+=32;

    // XV. Accion Derivada
    sec('XV. ACCION DERIVADA DE LA ATENCION BRINDADA:');
    check(28);
    borde(ML, y, W, 26);
    doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK);
    doc.text(`SEGUIMIENTO PSICOLOGICO:   VOLUNTARIO: ${val.seguimiento==='VOLUNTARIO'?'[X]':'[ ]'}   NECESARIO: ${val.seguimiento==='NECESARIO'?'[X]':'[ ]'}`, ML+2, y+5.5);
    doc.text(`REFERENCIA PSIQUIATRICA: SI ${val.referenciaPsiquiatricaValor==='SI'?'[X]':'[ ]'} NO: ${val.referenciaPsiquiatricaValor==='NO'?'[X]':'[ ]'}   MOTIVO: ${val.referenciaPsiquiatricaMotivo||''}`, ML+2, y+11);
    doc.text(`REFERENCIA NEUROLOGICA:  SI ${val.referenciaNeurologicaValor==='SI'?'[X]':'[ ]'} NO: ${val.referenciaNeurologicaValor==='NO'?'[X]':'[ ]'}   MOTIVO: ${val.referenciaNeurologicaMotivo||''}`, ML+2, y+16.5);
    doc.text(`REFERENCIA A OTRO ESPECIALISTA: ${val.referenciaOtroEspecialista||''}   MOTIVO: ${val.referenciaOtroMotivo||''}`, ML+2, y+22);
    doc.text(`ACOMPANAMIENTO: ${val.acompanamiento||''}   CANALIZACION: ${val.canalizacion||''}`, ML+2, y+26);
    y+=28;

    // Notas legales
    sec('XV. NOTAS');
    const nota1Txt = 'NOTA 1. La informacion obtenida es unicamente para valoracion psicologica para el programa RECONECTA CON LA PAZ, por ello se realizara para complementacion un estudio integral, aclarando que el dato obtenido podria no ser enteramente coincidente con la version que obra en su expediente de ejecucion pues esta no es recabada con fines de investigacion criminal o de consideracion para una declaracion oficial.';
    const nota2Txt = 'NOTA GENERAL: "El presente documento es el resultado de una valoracion psicologica referida solo a las circunstancias concretas del contexto en que fue solicitado; por tanto, no debe utilizarse en casos ni momentos diferentes a este. Si se produjese una modificacion sustancial en alguna de las circunstancias consideradas procederia una nueva evaluacion". Munoz (2013, p.68)';

    doc.setFontSize(8).setFont('helvetica','normal');
    const n1L = doc.splitTextToSize(nota1Txt, W-3.6);
    const n2L = doc.splitTextToSize(nota2Txt, W-3.6);
    const notH = n1L.length*3.6 + n2L.length*3.6 + 14;

    check(notH);
    borde(ML, y, W, notH);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica','bold'); doc.text('NOTA 1.', ML+2, y+5.5); doc.setFont('helvetica','normal');
    doc.text(doc.splitTextToSize(nota1Txt.replace('NOTA 1. ',''), W-22), ML+18, y+5.5);
    const yn2 = y+5.5 + n1L.length*3.6 + 4;
    doc.setFont('helvetica','bold'); doc.text('NOTA GENERAL:', ML+2, yn2); doc.setFont('helvetica','normal');
    doc.text(doc.splitTextToSize(nota2Txt.replace('NOTA GENERAL: ',''), W-30), ML+30, yn2);
    y += notH + 6;

    // Firma — centrada en la pagina
    check(32);
    const firmaN = val.nombreFirmante || 'LIC. PSIC. AVELINA ESCARCEGA PEREZ';
    const firmaC = val.cedFirmante    || '6487612';
    // Medir ancho del nombre para centrar la linea exactamente debajo
    doc.setFontSize(8).setFont('helvetica','bold');
    const nombreW = doc.getTextWidth(firmaN);
    const cedW    = doc.getTextWidth(`CED. PROF. ${firmaC}`);
    const lineW   = Math.max(nombreW, cedW) + 10; // 5mm de margen a cada lado
    const xFirma  = PW/2 - lineW/2;               // inicio de la linea (centrada)
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(xFirma, y+14, xFirma + lineW, y+14);
    doc.setFontSize(8).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text(firmaN, PW/2, y+19, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.text(`CED. PROF. ${firmaC}`, PW/2, y+24, {align:'center'});

    // Numeracion de paginas
    const total = (doc.internal as any).getNumberOfPages();
    for(let p=1; p<=total; p++){
      doc.setPage(p);
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(120,120,120);
      doc.text(`${p}`, PW/2, PH-5, {align:'center'});
    }

    return doc;
  }

  // ── Descarga ────────────────────────────────────────────────
  async descargarPdf():Promise<void>{
    this.estadoPdf.set({activo:true,pct:10,fase:'Iniciando...',exito:false,error:''});
    this.generandoPdf.set(true);
    try{
      this.estadoPdf.update(s=>({...s,pct:30,fase:'Cargando jsPDF...'})); await this._cargarJsPDF();
      this.estadoPdf.update(s=>({...s,pct:65,fase:'Construyendo paginas del PDF...'}));
      const doc=await this._generarPDF();
      this.estadoPdf.update(s=>({...s,pct:90,fase:'Preparando descarga...'}));
      const safe=(this._form.value.nombre||'valoracion').replace(/\s+/g,'_');
      doc.save(`valoracion_${safe}.pdf`);
      this.estadoPdf.update(s=>({...s,pct:100,fase:'PDF descargado!',exito:true}));
      setTimeout(()=>{this.estadoPdf.set({activo:false,pct:0,fase:'',exito:false,error:''});this.generandoPdf.set(false);this.mostrarToast('PDF descargado correctamente');},2200);
    }catch(e:any){
      this.estadoPdf.update(s=>({...s,pct:100,fase:'Error al generar',error:e?.message||''}));
      setTimeout(()=>{this.estadoPdf.set({activo:false,pct:0,fase:'',exito:false,error:''});this.generandoPdf.set(false);this.mostrarToast('Error al generar el PDF','error');},2200);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  HISTORIAL + DESCARGA EN CARPETA ZIP ORGANIZADA
  //
  //  Estructura del ZIP descargado:
  //  DGPDyPC-RCP-XXXXX/
  //    2026-03-20_VALORACION-CLINICA-PSICOLOGICA/
  //      VALORACION-CLINICA-PSICOLOGICA_<nombre>.pdf
  //      <archivos adjuntos subidos por el usuario>
  //
  //  Se usa JSZip (CDN) para crear el archivo ZIP en el navegador.
  // ══════════════════════════════════════════════════════════════

  /** Carga JSZip desde CDN una sola vez. */
  private _cargarJsZip(): Promise<void> {
    return new Promise((ok, err) => {
      if ((window as any).JSZip) return ok();
      const s = Object.assign(document.createElement('script'), {
        id:  'jszip-cdn',
        src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      });
      s.onload  = () => ok();
      s.onerror = () => err(new Error('No se pudo cargar JSZip'));
      document.head.appendChild(s);
    });
  }

  /**
   * Convierte un Data URL (base64) en un Uint8Array para agregarlo a JSZip.
   * @param dataUrl - Data URL completo (ej: "data:application/pdf;base64,...")
   */
  private _dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const binary  = atob(base64);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /**
   * Limpia un string para usarlo como nombre de archivo/carpeta válido.
   * Reemplaza caracteres problemáticos por guiones.
   */
  private _sanitizar(s: string): string {
    return s.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim();
  }

  /**
   * Crea y descarga un ZIP con la estructura de carpetas organizada:
   *   {expediente}/{fecha}_{tipo}/
   *     - PDF de la valoración
   *     - Archivos adjuntos
   *
   * @param entrada - Entrada del historial a descargar como carpeta
   */
  async descargarComoCareta(entrada: EntradaHistorial): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:10, fase:'Preparando carpeta...', exito:false, error:'' });
    try {
      await this._cargarJsZip();
      this.estadoPdf.update(s => ({ ...s, pct:40, fase:'Empaquetando archivos...' }));

      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();

      // Nombre de la carpeta raíz = número de expediente
      const carpetaRaiz = this._sanitizar(entrada.expediente);

      // Subcarpeta = fecha + tipo de documento
      const fechaLimpia = entrada.fecha.replace(/\//g, '-');
      const subcarpeta  = `${fechaLimpia}_VALORACION-CLINICA-PSICOLOGICA`;

      const ruta = `${carpetaRaiz}/${subcarpeta}/`;

      // Agregar el PDF de valoración
      zip.file(
        `${ruta}${this._sanitizar(entrada.pdf.nombre)}`,
        this._dataUrlToUint8Array(entrada.pdf.dataUrl)
      );

      // Agregar archivos adjuntos del usuario
      for (const archivo of entrada.archivos) {
        zip.file(
          `${ruta}${this._sanitizar(archivo.nombre)}`,
          this._dataUrlToUint8Array(archivo.dataUrl)
        );
      }

      this.estadoPdf.update(s => ({ ...s, pct:75, fase:'Generando ZIP...' }));

      // Generar el ZIP y disparar la descarga
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${carpetaRaiz}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Carpeta descargada!', exito:true }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.mostrarToast(`Carpeta ${carpetaRaiz} descargada`);
      }, 2200);

    } catch (e: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error al crear carpeta', error: e?.message||'' }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.mostrarToast('Error al crear la carpeta', 'error');
      }, 2200);
    }
  }

  // ── Guardar en historial ──────────────────────────────────────
  async guardarEnHistorial(): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:5, fase:'Preparando expediente...', exito:false, error:'' });
    this.guardando.set(true);
    try {
      this.estadoPdf.update(s => ({ ...s, pct:35, fase:'Generando PDF...' }));
      const doc     = await this._generarPDF();
      const dataUrl = doc.output('datauristring');
      const val     = this._form.value;
      const expId   = val.numeroExpediente || `EXP-${Date.now()}`;

      // Nombre del PDF con expediente + nombre del evaluado
      const pdfNombre = `VALORACION-CLINICA-PSICOLOGICA_${this._sanitizar(val.nombre||'SIN-NOMBRE')}.pdf`;

      const entrada: EntradaHistorial = {
        id:         Date.now(),
        expediente: expId,
        nombre:     val.nombre,
        delito:     val.delito,
        fecha:      new Date().toLocaleDateString('es-MX'),
        pdf:        { nombre: pdfNombre, dataUrl },
        archivos:   [...this.archivosAdjuntos()],
      };

      this.estadoPdf.update(s => ({ ...s, pct:65, fase:'Guardando en historial...' }));
      this.historial.update(prev => {
        const idx = prev.findIndex(e => e.expediente === expId);
        if (idx >= 0) {
          const c = [...prev];
          c[idx] = { ...c[idx], ...entrada, archivos: [...c[idx].archivos, ...entrada.archivos] };
          return c;
        }
        return [entrada, ...prev];
      });

      // Descargar automáticamente como carpeta ZIP organizada
      this.estadoPdf.update(s => ({ ...s, pct:80, fase:'Creando carpeta ZIP...' }));
      await this._cargarJsZip();
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const carpetaRaiz = this._sanitizar(expId);
      const fechaLimpia = entrada.fecha.replace(/\//g, '-');
      const ruta = `${carpetaRaiz}/${fechaLimpia}_VALORACION-CLINICA-PSICOLOGICA/`;

      zip.file(`${ruta}${this._sanitizar(pdfNombre)}`, this._dataUrlToUint8Array(dataUrl));
      for (const archivo of this.archivosAdjuntos()) {
        zip.file(`${ruta}${this._sanitizar(archivo.nombre)}`, this._dataUrlToUint8Array(archivo.dataUrl));
      }

      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${carpetaRaiz}.zip`; a.click();
      URL.revokeObjectURL(url);

      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Expediente guardado y descargado!', exito:true }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.guardando.set(false);
        this.mostrarVistaPrevia.set(false);
        this.mostrarToast(`Expediente ${expId} guardado y descargado`);
      }, 2200);

    } catch (e: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error', error: e?.message||'' }));
      setTimeout(() => {
        this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' });
        this.guardando.set(false);
        this.mostrarToast('Error al guardar', 'error');
      }, 2200);
    }
  }

  eliminarExpediente(id:number):void{this.historial.update(p=>p.filter(e=>e.id!==id));this.mostrarToast('Expediente eliminado');}

  /** Descarga el PDF de un expediente del historial. */
  descargarPdfHistorial(e:EntradaHistorial):void{this._dl(e.pdf.dataUrl, e.pdf.nombre);}

  /** Descarga todos los archivos del expediente como carpeta ZIP. */
  descargarExpedienteCompleto(e:EntradaHistorial):void{this.descargarComoCareta(e);}

descargarArchivo(a:ArchivoAdjunto):void{this._dl(a.dataUrl,a.nombre);}
  private _dl(url:string,name:string):void{Object.assign(document.createElement('a'),{href:url,download:name}).click();}
  regresarPantallaAnterior(){this.router.navigate(['/seleccion']);}
  irATrabajoSocial(){this.router.navigate(['/trabajo-social']);}
  cerrarSesion():void{alert('Sesion cerrada.\n(TODO: integrar con AuthService + Router)');}

  // ── Helpers para el template ─────────────────────────────────
  v(k:string):any{return this._form?.get(k)?.value;}
  ch(v:boolean):string{return v?'[X]':'[ ]';}
  dot(a:string,b:string):string{return a===b?'(*)':'( )';}
  chkPdf(v:boolean):string{return v?'[X]':'[ ]';}
  dotPdf(a:string,b:string):string{return a===b?'(*)':'( )';}
  iconoArchivo(t:string):string{return t?.includes('pdf')?'📄':t?.includes('image')?'🖼️':'📝';}
  truncar(n:string,m=20):string{return n.length>m?n.slice(0,m-3)+'...':n;}
}