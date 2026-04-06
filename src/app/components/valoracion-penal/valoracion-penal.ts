/**
 * @file valoracion-penal.component.ts  v6.0.0
 * @description Componente Angular 18+ standalone — Valoración Clínica Psicológica
 *              Programa "Reconecta con la Paz" — DGPD y PC
 *
 * CAMBIOS v6 (integración backend):
 *  1. Auto-llenado del formulario con datos del beneficiario (GET /beneficiarios/:id)
 *     y del expediente (pasado por router state / sessionStorage).
 *  2. Al guardar: POST a /penal/valoracion-psicologica con el JSON estructurado.
 *  3. Console.log de beneficiario y expediente para depuración.
 *  4. Señales nuevas: autoLlenando, beneficiario, camposAutoLlenados con
 *     animación de "highlight" sobre los campos recién rellenados.
 *  5. Diseño y HTML sin cambios (no se tocaron .html ni .css).
 */

import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

// ─── Interfaces ──────────────────────────────────────────────────
export interface ArchivoAdjunto   { id:number; nombre:string; tamano:number; tipo:string; dataUrl:string; }
export interface EntradaHistorial { id:number; expediente:string; nombre:string; delito:string; fecha:string; pdf:{nombre:string;dataUrl:string}; archivos:ArchivoAdjunto[]; }
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
  {titulo:'Encabezado',        descripcion:'Numero de expediente y datos del caso',   icono:'📋', campos:['numeroExpediente']},
  {titulo:'I. Metodologia',    descripcion:'Instrumentos aplicados',                  icono:'🔬', campos:[]},
  {titulo:'II. Datos Generales',descripcion:'Informacion personal del evaluado',      icono:'👤', campos:['nombre','edad','fechaNacimiento','lugarNacimiento','estadoCivil','ocupacionActual','situacionJuridica']},
  {titulo:'III. Apariencia',   descripcion:'Aspecto fisico durante la entrevista',    icono:'👁️', campos:[]},
  {titulo:'IV. Actitud',       descripcion:'Actitud durante la entrevista',           icono:'🤝', campos:[]},
  {titulo:'V. Examen Mental',  descripcion:'Estado mental y cognicion',               icono:'🧠', campos:['conciencia']},
  {titulo:'VI. Rendimiento',   descripcion:'Capacidades intelectuales',               icono:'📊', campos:[]},
  {titulo:'VII. Caracter',     descripcion:'Rasgos de caracter',                      icono:'⚡', campos:[]},
  {titulo:'VIII. Emocional',   descripcion:'Sintomatologia emocional',                icono:'❤️', campos:[]},
  {titulo:'IX. Social',        descripcion:'Actitud social',                          icono:'🌐', campos:[]},
  {titulo:'X. Psicosocial',    descripcion:'Factores psicosociales',                  icono:'🏘️', campos:[]},
  {titulo:'XI. Adicciones',    descripcion:'Uso de sustancias psicoactivas',          icono:'💊', campos:[]},
  {titulo:'XII. Familia',      descripcion:'Dinamica familiar',                       icono:'👨‍👩‍👧', campos:[]},
  {titulo:'XIII. Hechos',      descripcion:'Version subjetiva de los hechos',         icono:'📝', campos:[]},
  {titulo:'XIV. Observaciones',descripcion:'Observaciones y resultados de pruebas',  icono:'🔍', campos:[]},
  {titulo:'XV. Accion',        descripcion:'Accion derivada de la atencion',          icono:'🎯', campos:[]},
  {titulo:'Firma y Adjuntos',  descripcion:'Datos del perito y documentos adjuntos', icono:'✍️', campos:[]},
];

export const CAMPOS_REQUERIDOS = PASOS.flatMap(p => p.campos);

// ─── Componente ──────────────────────────────────────────────────
@Component({
  selector: 'app-valoracion-penal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './valoracion-penal.html',
  styleUrls:   ['./valoracion-penal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValoracionPenalComponent implements OnInit, OnDestroy {

  private readonly fb           = inject(FormBuilder);
  private readonly router       = inject(Router);
  private readonly penalService = inject(PenalService);
  private session = inject(SessionService);

  // ── Señales de UI ─────────────────────────────────────────────
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

  // ── NUEVAS SEÑALES v6 ─────────────────────────────────────────
  /** true mientras se consulta el backend al cargar */
  readonly autoLlenando       = signal(false);
  /** datos del beneficiario obtenidos del backend */
  readonly beneficiario       = signal<any>(null);
  /** campos que se auto-rellenaron (para animación de highlight) */
  readonly camposAutoLlenados = signal<Set<string>>(new Set());

  // ── Datos del expediente (router state / sessionStorage) ──────
  expediente: any      = null;
  valoracionId: number | null = null;
  autoSaveInterval: any;
  ultimaActualizacion = '';

  // ── Computed ──────────────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════
  //  ngOnInit — recuperar expediente + auto-llenado
  // ════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this._buildForm();
    this._iniciarContadorProgreso();

    // 1️⃣ Recuperar expediente desde router state o sessionStorage
    const state = history.state as { expediente?: any };
    if (state?.expediente) {
      this.expediente = state.expediente;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try { this.expediente = JSON.parse(raw); } catch { this.expediente = null; }
      }
    }
    this.formGroup.get('fechaNacimiento')?.valueChanges.subscribe(fecha => {
  const edad = this._calcularEdad(fecha);
  this.formGroup.patchValue({ edad }, { emitEvent: false });
});

    // 2️⃣ Si tenemos expediente, auto-llenar y cargar beneficiario
    if (this.expediente) {
      console.log('📁 Expediente cargado:', this.expediente);
      this._autoLlenarDesdeExpediente(this.expediente);

      const beneficiarioId = this.expediente?.beneficiario?.id ?? this.expediente?.beneficiarioId;
      if (beneficiarioId) {
        this._cargarBeneficiario(beneficiarioId);
      }
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Contador de progreso (suscripción al form) ─────────────────
  private _iniciarContadorProgreso(): void {
    const calc = () => {
      const v = this._form?.value ?? {};
      const n = CAMPOS_REQUERIDOS.filter(k => v[k] && v[k] !== '').length;
      this.porcentaje.set(CAMPOS_REQUERIDOS.length ? Math.round((n / CAMPOS_REQUERIDOS.length) * 100) : 0);
    };
    calc();
    this._form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(calc);
  }

  // ════════════════════════════════════════════════════════════════
  //  AUTO-LLENADO DESDE EXPEDIENTE
  //  Mapea los campos del expediente al formulario
  // ════════════════════════════════════════════════════════════════
  private _autoLlenarDesdeExpediente(exp: any): void {
    const patch: Record<string, any> = {};
    const llenos = new Set<string>();

    // Número de expediente
    if (exp.id || exp.numeroExpediente) {
      patch['numeroExpediente'] = exp.numeroExpediente ?? exp.id ?? '';
      llenos.add('numeroExpediente');
    }
    // Expediente penal / juzgado
    if (exp.juzgado || exp.expPenal) {
      patch['expPenal'] = exp.expPenal ?? exp.juzgado ?? '';
      llenos.add('expPenal');
    }
    // Delito
    if (exp.delito) {
      patch['delito'] = exp.delito;
      llenos.add('delito');
    }
    // Institución
    if (exp.institucion) {
      patch['institucion'] = exp.institucion;
      llenos.add('institucion');
    }
    // Situación jurídica
    if (exp.medidaCautelar || exp.situacionJuridica) {
      patch['situacionJuridica'] = exp.situacionJuridica ?? exp.medidaCautelar ?? '';
      llenos.add('situacionJuridica');
    }
    // Nombre del beneficiario (puede venir embebido en exp.beneficiario)
    if (exp.beneficiario?.nombre) {
      patch['nombre'] = exp.beneficiario.nombre;
      llenos.add('nombre');
    }

    if (Object.keys(patch).length > 0) {
      this._form.patchValue(patch, { emitEvent: true });
      this._animarCamposLlenados(llenos);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  CARGAR BENEFICIARIO DESDE BACKEND
  //  GET /beneficiarios/:id
  // ════════════════════════════════════════════════════════════════
  private _cargarBeneficiario(id: number | string): void {
    this.autoLlenando.set(true);

    this.penalService.getBeneficiario(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // El objeto puede venir directo o dentro de una propiedad
          const ben = res?.beneficiario ?? res ?? {};
          this.beneficiario.set(ben);
          console.log('👤 Beneficiario:', ben);

          this._autoLlenarDesdeBeneficiario(ben);
          this.autoLlenando.set(false);
          this.mostrarToast('✅ Datos del beneficiario cargados', 'success');
        },
        error: (err) => {
          console.warn('⚠️ No se pudo cargar el beneficiario:', err);
          this.autoLlenando.set(false);
          this.mostrarToast('Sin datos previos del beneficiario', 'error');
        }
      });
  }

  // ════════════════════════════════════════════════════════════════
  //  AUTO-LLENADO DESDE BENEFICIARIO
  //  Mapea los campos del objeto beneficiario al formulario
  // ════════════════════════════════════════════════════════════════
  private _autoLlenarDesdeBeneficiario(ben: any): void {
    if (!ben) return;

    const patch: Record<string, any> = {};
    const llenos = new Set<string>();

    const set = (campo: string, valor: any) => {
      // Solo sobreescribe si el campo está vacío en el formulario
      const actual = this._form.get(campo)?.value;
      if ((!actual || actual === '') && valor) {
        patch[campo] = valor;
        llenos.add(campo);
      }
    };

    // Mapeo beneficiario → campos del formulario
    set('nombre',           ben.nombre            ?? ben.nombre_completo ?? '');
    set('edad',             ben.edad              ?? this._calcularEdad(ben.fechaNacimiento ?? ben.fecha_nacimiento));
    set('fechaNacimiento',  ben.fechaNacimiento   ?? ben.fecha_nacimiento ?? '');
    set('lugarNacimiento',  ben.lugarNacimiento   ?? ben.lugar_nacimiento ?? '');
    set('estadoCivil',      ben.estadoCivil       ?? ben.estado_civil ?? '');
    set('domicilio',        ben.domicilio         ?? ben.direccion ?? '');
    set('religion',         ben.religion          ?? '');
    set('orientacionSexual',ben.orientacionSexual ?? ben.orientacion_sexual ?? '');
    set('nivelEscolaridad', ben.escolaridad        ?? ben.nivel_escolaridad ?? '');
    set('ocupacionActual',  ben.ocupacion          ?? ben.ocupacion_actual ?? '');
    set('lenguaMaterna',    ben.lenguaMaterna      ?? ben.lengua_materna ?? '');
    set('contactoEmergencia', ben.contactoEmergencia ?? ben.contacto_emergencia ?? '');

    if (Object.keys(patch).length > 0) {
      this._form.patchValue(patch, { emitEvent: true });
      this._animarCamposLlenados(llenos);
    }
  }

  // ── Calcula la edad a partir de fecha de nacimiento ────────────
  private _calcularEdad(fechaNac: string): string {
    if (!fechaNac) return '';
    try {
      const hoy   = new Date();
      const nac   = new Date(fechaNac);
      let edad = hoy.getFullYear() - nac.getFullYear();
      const m  = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
      return edad > 0 ? String(edad) : '';
    } catch { return ''; }
  }

  // ── Animación de highlight en campos recién llenados ───────────
  // Agrega la clase CSS 'campo-autollenado' vía atributo data y la
  // quita después de 2 s. El CSS existente no se modifica; la clase
  // se inyecta en el <style> del head una sola vez.
  private _highlightInyectado = false;
  private _animarCamposLlenados(campos: Set<string>): void {
    if (!this._highlightInyectado) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes highlight-fill {
          0%   { background-color: rgba(200,149,42,0.30); box-shadow: 0 0 0 2px rgba(200,149,42,0.6); }
          60%  { background-color: rgba(200,149,42,0.15); box-shadow: 0 0 0 3px rgba(200,149,42,0.3); }
          100% { background-color: transparent; box-shadow: none; }
        }
        .campo-autollenado {
          animation: highlight-fill 2s ease forwards !important;
          border-radius: 6px;
        }
      `;
      document.head.appendChild(style);
      this._highlightInyectado = true;
    }

    this.camposAutoLlenados.set(new Set(campos));

    // Aplicar clase a los inputs correspondientes via DOM
    setTimeout(() => {
      campos.forEach(campo => {
        const el = document.querySelector(`[formcontrolname="${campo}"]`) as HTMLElement;
        if (el) {
          el.classList.add('campo-autollenado');
          setTimeout(() => el.classList.remove('campo-autollenado'), 2200);
        }
      });
    }, 80);

    // Limpiar señal tras la animación
    setTimeout(() => this.camposAutoLlenados.set(new Set()), 2500);
  }

  // ════════════════════════════════════════════════════════════════
  //  CONSTRUCCIÓN DEL FORMULARIO
  // ════════════════════════════════════════════════════════════════
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

  // ── Wizard ──────────────────────────────────────────────────────
  siguientePaso(): void { if(this.pasoActual()<PASOS.length-1){this.pasoActual.update(p=>p+1);this._st();} }
  anteriorPaso(): void  { if(this.pasoActual()>0){this.pasoActual.update(p=>p-1);this._st();} }
  irAlPaso(i:number): void { this.pasoActual.set(i);this._st(); }
  private _st(){ window.scrollTo({top:0,behavior:'smooth'}); }
  completitudPaso(i:number):number{const c=PASOS[i]?.campos??[];if(!c.length)return 100;const v=this._form?.value??{};return Math.round((c.filter(k=>v[k]&&v[k]!=='').length/c.length)*100);}
  pasoCompleto(i:number):boolean{return this.completitudPaso(i)===100;}
  porcentajeCompletitud():number{return this.porcentaje();}

  // ── Archivos ─────────────────────────────────────────────────────
  procesarArchivos(l:FileList|null):void{if(!l)return;Array.from(l).forEach(f=>{const r=new FileReader();r.onload=e=>this.archivosAdjuntos.update(p=>[...p,{id:Date.now()+Math.random(),nombre:f.name,tamano:f.size,tipo:f.type,dataUrl:e.target!.result as string}]);r.readAsDataURL(f);});}
  eliminarArchivo(id:number):void{this.archivosAdjuntos.update(p=>p.filter(a=>a.id!==id));}

  // ── Toast ─────────────────────────────────────────────────────────
  mostrarToast(msg:string,tipo:'success'|'error'='success'):void{this.toast.set({mensaje:msg,tipo});setTimeout(()=>this.toast.set({mensaje:'',tipo:''}),3500);}

  // ════════════════════════════════════════════════════════════════
  //  GENERACIÓN DE PDF — igual que v5 (sin cambios)
  // ════════════════════════════════════════════════════════════════

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

    const PW  = doc.internal.pageSize.getWidth();
    const PH  = doc.internal.pageSize.getHeight();
    const ML  = 8;
    const MT  = 10;
    const MB  = 12;
    const W   = PW - ML*2;
    const yMax= PH - MB;

    type RGB=[number,number,number];
    const VINO:RGB=[133,10,49], GRAY:RGB=[200,200,200], LGRAY:RGB=[238,238,238];
    const BLACK:RGB=[0,0,0], DKGRAY:RGB=[80,80,80];

    let y = MT;
    let pageNum = 1;

    const nuevaPagina = () => {
      doc.addPage(); pageNum++;
      y = MT;
      doc.setFillColor(220,220,220);
      doc.rect(ML, y, W, 5, 'F');
      doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...VINO);
      doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL — VALORACION CLINICA PSICOLOGICA', PW/2, y+3.5, {align:'center'});
      doc.setTextColor(...BLACK);
      y += 7;
    };

    const check = (need:number) => { if(y + need > yMax) nuevaPagina(); };

    const borde = (x:number,cy:number,w:number,h:number) => {
      doc.setDrawColor(140,140,140);
      doc.rect(x, cy, w, h, 'S');
    };

    const txtCelda = (x:number,cy:number,w:number,h:number,txt:string,bold=false,align:'left'|'center'|'right'='left',fs=8) => {
      if(!txt) return;
      doc.setFontSize(fs).setFont('helvetica',bold?'bold':'normal').setTextColor(...BLACK);
      const pad=1.8, maxW=w-pad*2;
      const lines=doc.splitTextToSize(txt,maxW);
      const lh=fs*0.45, totalH=lines.length*lh;
      const startY=cy+(h-totalH)/2+lh;
      const tx=align==='center'?x+w/2:align==='right'?x+w-pad:x+pad;
      doc.text(lines,tx,startY,{align});
    };

    const cell = (x:number,cy:number,w:number,h:number,txt:string,bold=false,fill?:RGB,align:'left'|'center'|'right'='left',fs=8) => {
      if(fill){ doc.setFillColor(...fill); doc.rect(x,cy,w,h,'F'); }
      borde(x,cy,w,h);
      if(txt) txtCelda(x,cy,w,h,txt,bold,align,fs);
    };

    const cellAuto = (x:number,cy:number,w:number,txt:string,bold=false,fs=8,minH=5,padV=2):number => {
      const pad=1.8;
      const lines=txt?doc.splitTextToSize(txt,w-pad*2):[''];
      const lh=fs*0.45;
      const h=Math.max(minH,lines.length*lh+padV*2);
      if(txt){ doc.setFillColor(255,255,255); }
      borde(x,cy,w,h);
      if(txt){
        doc.setFontSize(fs).setFont('helvetica',bold?'bold':'normal').setTextColor(...BLACK);
        doc.text(lines,x+pad,cy+padV+lh);
      }
      return h;
    };

    const sec = (titulo:string,hBar=5.5) => {
      check(hBar+2);
      doc.setFillColor(...GRAY);
      doc.rect(ML,y,W,hBar,'F');
      doc.setDrawColor(120,120,120);
      doc.rect(ML,y,W,hBar,'S');
      doc.setFontSize(8.5).setFont('helvetica','bold').setTextColor(...BLACK);
      doc.text(titulo,PW/2,y+hBar/2+1.6,{align:'center'});
      y+=hBar+1;
    };

    const chk = (v:boolean)=>v?'[X]':'[ ]';
    const dot = (val:string,op:string)=>val===op?'(*)':'( )';

    // ── Encabezado ──
    const wLogoZone=36, wExpZone=72;
    const xE=PW-ML-wExpZone;
    const wCentro=xE-(ML+wLogoZone)-2;
    const xCentro=ML+wLogoZone+1+wCentro/2;
    const fH=5.5;

    const cellExp=(cy:number,txt:string,bold=false)=>{
      if(bold){ doc.setFillColor(...LGRAY); doc.rect(xE,cy,wExpZone,fH,'F'); }
      doc.setDrawColor(140,140,140);
      doc.rect(xE,cy,wExpZone,fH,'S');
      doc.setFontSize(7).setFont('helvetica',bold?'bold':'normal').setTextColor(...BLACK);
      const lines=doc.splitTextToSize(txt,wExpZone-3);
      doc.text(lines[0]||'',xE+1.5,cy+fH/2+1.2);
    };
    cellExp(y,`No. Exp: DGPDyPC-RCP-${val.numeroExpediente||''}`,true);
    cellExp(y+fH,`Exp. Penal: ${val.expPenal||''}`);
    cellExp(y+fH*2,`Delito: ${val.delito||''}`);
    cellExp(y+fH*3,`Institucion: ${val.institucion||''}`);
    cellExp(y+fH*4,`Fecha de Estudio: ${val.fechaEstudio||''}`);

    doc.setFontSize(9.5).setFont('helvetica','bold').setTextColor(...VINO);
    doc.text('SEGURIDAD CIUDADANA',ML,y+5);
    doc.setFontSize(6).setFont('helvetica','normal').setTextColor(...DKGRAY);
    doc.text('SECRETARIA DE SEGURIDAD',ML,y+8.5);
    doc.text('Y PROTECCION',ML,y+11.5);

    const lh2=3.8, yB0=y+2.5;
    doc.setFontSize(7.2).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('SUBSECRETARIA DE PREVENCION Y REINSERCION SOCIAL',xCentro,yB0,{align:'center',maxWidth:wCentro});
    doc.text('DIRECCION GENERAL DE PREVENCION DEL DELITO',xCentro,yB0+lh2,{align:'center',maxWidth:wCentro});
    doc.text('Y PARTICIPACION CIUDADANA',xCentro,yB0+lh2*2,{align:'center',maxWidth:wCentro});
    doc.setFontSize(9).setFont('helvetica','bold');
    doc.text('VALORACION CLINICA PSICOLOGICA',xCentro,yB0+lh2*3+2,{align:'center',maxWidth:wCentro});

    y+=30;
    doc.setDrawColor(...VINO); doc.setLineWidth(0.6);
    doc.line(ML,y,ML+W,y);
    doc.setLineWidth(0.2); y+=3;

    cell(ML,y,W*0.24,5.5,'MOTIVO DE VALORACION:',true,LGRAY);
    cell(ML+W*0.24,y,W*0.76,5.5,'Inclusion al programa "RECONECTA CON LA PAZ."');
    y+=7.5;

    // I. Metodología
    sec('I.- METODOLOGIA');
    const metW=W/2, metH=4.8;
    [
      ['CONSENTIMIENTO INFORMADO','ENTREVISTA CLINICA PSICOLOGICA'],
      ['OBSERVACION DIRECTA','EXAMEN COGNOSCITIVO MINI-MENTAL (MOCA)'],
      ['TEST PERSONA BAJO LA LLUVIA','TEST ASSIT (ADICCIONES)'],
      ['TEST INVENTARIO DE DEPRESION Y ANSIEDAD DE BECK','TEST. CUESTIONARIO DE AGRESIVIDAD AQ'],
      ['TEST CUESTIONARIO IPDE',''],
    ].forEach(([a,b])=>{
      check(metH);
      cell(ML,y,metW,metH,'v '+a,false,[248,252,248]);
      cell(ML+metW,y,metW,metH,b?'v '+b:'',false,[248,252,248]);
      y+=metH;
    }); y+=2;

    // II. Datos Generales
    sec('II.- DATOS GENERALES');
    const dH=5.5, dW=W/2;
    ([
      [`NOMBRE: ${val.nombre||''}`,`EDAD: ${val.edad||''}`],
      [`SOBRE NOMBRE: ${val.sobreNombre||''}`,`FECHA DE NACIMIENTO: ${val.fechaNacimiento||''}`],
      [`LUGAR DE NACIMIENTO: ${val.lugarNacimiento||''}`,`ESTADO CIVIL: ${val.estadoCivil||''}`],
      [`DOMICILIO: ${val.domicilio||''}`,`RELIGION: ${val.religion||''}`],
      [`ORIENTACION SEXUAL: ${val.orientacionSexual||''}`,`NIVEL DE ESCOLARIDAD: ${val.nivelEscolaridad||''}`],
      [`OCUPACION ACTUAL: ${val.ocupacionActual||''}`,`LENGUA MATERNA: ${val.lenguaMaterna||''}`],
    ] as [string,string][]).forEach(([a,b])=>{
      check(dH);
      cell(ML,y,dW,dH,a);
      cell(ML+dW,y,dW,dH,b);
      y+=dH;
    });
    check(dH); cell(ML,y,W,dH,`SITUACION JURIDICA: ${val.situacionJuridica||''}`); y+=dH;
    check(dH); cell(ML,y,W,dH,`CONTACTO DE EMERGENCIA: ${val.contactoEmergencia||''}`); y+=dH+1.5;

    // (resto de secciones del PDF igual que v5 — se omiten por brevedad en este diff,
    //  el código completo a continuación mantiene todas las secciones)

    // III. Apariencia
    sec('III. APARIENCIA');
    const aH=5;
    const aC=[W*0.17,W*0.27,W*0.12,W*0.44];
    const aX=[ML,ML+aC[0],ML+aC[0]+aC[1],ML+aC[0]+aC[1]+aC[2]];
    check(aH*11+8);
    doc.setFillColor(242,242,242);
    doc.rect(aX[2],y,aC[2],aH*9,'F');
    borde(aX[2],y,aC[2],aH*9);
    doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('SENAS PARTICULARES',aX[2]+aC[2]/2,y+aH*9/2,{align:'center',angle:90});
    borde(aX[3],y,aC[3],aH*5);
    doc.setFontSize(7.5).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('TATUAJES / CICATRICES ETC:',aX[3]+1.8,y+4);
    if(val.tatuajes){ doc.setFont('helvetica','normal').setFontSize(7.5); doc.text(doc.splitTextToSize(val.tatuajes,aC[3]-3.6),aX[3]+1.8,y+8); }
    cell(aX[0],y,aC[0],aH*3,'EDAD APARENTE',true,LGRAY);
    cell(aX[1],y,aC[1],aH,`MENOR A LA CRONOLOGICA  ${val.edadAparente==='MENOR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`IGUAL A LA CRONOLOGICA  ${val.edadAparente==='IGUAL'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`MAYOR A LA CRONOLOGICA  ${val.edadAparente==='MAYOR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[0],y,aC[0],aH*3,'HIGIENE',true,LGRAY);
    borde(aX[3],y,aC[3],aH*4);
    cell(aX[1],y,aC[1],aH,`LIMPIO  ${val.higiene==='LIMPIO'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`REGULAR ${val.higiene==='REGULAR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`SUCIO   ${val.higiene==='SUCIO'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[0],y,aC[0],aH*3,'ARREGLO',true,LGRAY);
    cell(aX[1],y,aC[1],aH,`ALINADO      ${val.arreglo==='ALINADO'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`REGULAR      ${val.arreglo==='REGULAR'?'[X]':'[ ]'}`); y+=aH;
    cell(aX[1],y,aC[1],aH,`DESALINADO   ${val.arreglo==='DESALINADO'?'[X]':'[ ]'}`); y+=aH;
    check(aH);
    cell(ML,y,W,aH,`LESIONES RECIENTES: ${val.lesionesRecientes||'NO'}   CUAL O CUALES: ${val.cualesLesiones||''}   MOTIVO: ${val.motivoLesiones||''}`);
    y+=aH;
    check(5);
    const hDesc=cellAuto(ML,y,W,`DESCRIPCION FISICA: ${val.descripcionFisica||''}`,false,8,5);
    y+=hDesc+1.5;

    // IV. Actitud
    sec('IV. ACTITUD DURANTE LA ENTREVISTA');
    const aw=W/4, ah=5;
    check(ah*3);
    cell(ML,y,aw,ah,`${chk(val.actitudRespeta)} RESPETA`);
    cell(ML+aw,y,aw,ah,`${chk(val.actitudSigueInstrucciones)} SIGUE INSTRUCCIONES`);
    cell(ML+aw*2,y,aw,ah,`${chk(val.actitudAgresivo)} AGRESIVO`);
    cell(ML+aw*3,y,aw,ah,`${chk(val.actitudSeductor)} SEDUCTOR`); y+=ah;
    cell(ML,y,aw,ah,`${chk(val.actitudColabora)} COLABORA`);
    cell(ML+aw,y,aw,ah,`${chk(val.actitudConcreto)} CONCRETO`);
    cell(ML+aw*2,y,aw,ah,`${chk(val.actitudIndiferente)} INDIFERENTE`);
    cell(ML+aw*3,y,aw,ah,`${chk(val.actitudManipulador)} MANIPULADOR`); y+=ah;
    cell(ML,y,W/2,ah,`ESTADO DE ANIMO: ${val.estadoAnimo||''}`);
    cell(ML+W/2,y,W/2,ah,`OTRA: ${val.otraActitud||''}`); y+=ah+1.5;

    // V. Examen Mental
    sec('V. EXAMEN MENTAL');
    const eW=[W*0.22,W*0.20,W*0.20,W*0.18,W*0.20];
    const eH=5;
    [
      ['1) CONCIENCIA',`LUCIDA: ${val.conciencia==='LUCIDA'?'[X]':'[ ]'}`,`OBNUBILADA: ${val.conciencia==='OBNUBILADA'?'[X]':'[ ]'}`,`CONFUSA: ${val.conciencia==='CONFUSA'?'[X]':'[ ]'}`,''],
      ['2) ORIENTACION',`TIEMPO: ${chk(val.orientacionTiempo)}`,`PERSONA: ${chk(val.orientacionPersona)}`,`ESPACIO: ${chk(val.orientacionEspacio)}`,`OBS: ${val.orientacionObservaciones||''}`],
      ['3) MEMORIA',`CONSERVADA: ${chk(val.memoriaConservada)}`,`DISMINUIDA: ${chk(val.memoriaDisminuida)}`,'',`OBS: ${val.memoriaObservaciones||''}`],
      ['4) ATENCION',`DISPERSA: ${chk(val.atencionDispersa)}`,`CONCENTRADA: ${chk(val.atencionConcentrada)}`,'',`OBS: ${val.atencionObservaciones||''}`],
      ['5) SENSOPERCEPCION',`ADECUADA: ${chk(val.sensopercepcionAdecuada)}`,`ALTERADA: ${chk(val.sensopercepcionAlterada)}`,'',`OBS: ${val.sensopercepcionObservaciones||''}`],
      ['6) TIPO CONTENIDO',`LOGICO: ${chk(val.contenidoLogico)} COHERENTE: ${chk(val.contenidoCoherente)}`,`CONGRUENTE: ${chk(val.contenidoCongruente)}`,`INDUCTIVO: ${chk(val.contenidoInductivo)} DEDUCTIVO: ${chk(val.contenidoDeductivo)}`,`INCONGRUENTE: ${chk(val.contenidoIncongruente)}`],
      ['7) NIVEL PENSAMIENTO',`CONCRETO: ${chk(val.nivelPensamientoConcreto)}`,`FUNCIONAL: ${chk(val.nivelPensamientoFuncional)}`,`ABSTRACTO: ${chk(val.nivelPensamientoAbstracto)}`,`OBS: ${val.nivelPensamientoObservaciones||''}`],
      ['8) CURSO LENGUAJE',`NORMAL: ${chk(val.lenguajeNormal)} RAPIDO: ${chk(val.lenguajeRapido)}`,`LENTO: ${chk(val.lenguajeLento)}`,`CLARO: ${chk(val.lenguajeClaro)}`,`TECNICO: ${chk(val.lenguajeTecnico)}`],
    ].forEach(([a,b,c,d,e])=>{
      check(eH);
      let xr=ML;
      [a,b,c,d,e].forEach((t,i)=>{ cell(xr,y,eW[i],eH,t,i===0); xr+=eW[i]; });
      y+=eH;
    }); y+=2;

    // VI. Rendimiento Intelectual
    sec('VI. RENDIMIENTO INTELECTUAL');
    const riC=[W*0.36,W*0.22,W*0.22,W*0.20];
    [
      ['CAPACIDAD DE JUICIO',`AUMENTADO: ${dot(val.capacidadJuicio,'AUMENTADO')}`,`CONSERVADO: ${dot(val.capacidadJuicio,'CONSERVADO')}`,`DISMINUIDO: ${dot(val.capacidadJuicio,'DISMINUIDO')}`],
      ['CAPACIDAD DE ANALISIS',`ALTA: ${dot(val.capacidadAnalisis,'ALTA')}`,`MEDIA: ${dot(val.capacidadAnalisis,'MEDIA')}`,`BAJA: ${dot(val.capacidadAnalisis,'BAJA')}`],
      ['CAPACIDAD DE SINTESIS',`ALTA: ${dot(val.capacidadSintesis,'ALTA')}`,`MEDIA: ${dot(val.capacidadSintesis,'MEDIA')}`,`BAJA: ${dot(val.capacidadSintesis,'BAJA')}`],
      ['CAPACIDAD DE PLANEACION',`LOGICA: ${dot(val.capacidadPlaneacion,'LOGICA')}`,`RIGIDA: ${dot(val.capacidadPlaneacion,'RIGIDA')}`,`CAOTICA: ${dot(val.capacidadPlaneacion,'CAOTICA')}`],
      ['CAPACIDAD DE ORGANIZACION',`LOGICA: ${dot(val.capacidadOrganizacion,'LOGICA')}`,`RIGIDA: ${dot(val.capacidadOrganizacion,'RIGIDA')}`,`CAOTICA: ${dot(val.capacidadOrganizacion,'CAOTICA')}`],
    ].forEach(([a,b,c,d])=>{
      check(5);
      let xr=ML;
      [a,b,c,d].forEach((t,i)=>{ cell(xr,y,riC[i],5,t,i===0); xr+=riC[i]; });
      y+=5;
    }); y+=2;

    // VII. Rasgos de Caracter
    sec('VII. RASGOS DE CARACTER');
    const rcC=[W*0.40,W*0.13,W*0.13,W*0.13,W*0.21];
    check(5);
    let xrc=ML;
    ['','ALTA','MEDIA','BAJA','MANEJO DE AGRESIVIDAD'].forEach((t,i)=>{ cell(xrc,y,rcC[i],5,t,true,GRAY,'center',7.5); xrc+=rcC[i]; }); y+=5;
    const rcYInicio=y;
    [['TOLERANCIA A LA FRUSTRACION','toleranciaFrustracion'],['CAPACIDAD DE DEMORA','capacidadDemora'],['CONTROL DE IMPULSOS','controlImpulsos']].forEach(([lbl,key],idx)=>{
      check(5); xrc=ML;
      cell(xrc,y,rcC[0],5,lbl); xrc+=rcC[0];
      ['ALTA','MEDIA','BAJA'].forEach((op,ci)=>{ cell(xrc,y,rcC[ci+1],5,val[key]===op?'(*)':'( )',false,undefined,'center',9); xrc+=rcC[ci+1]; });
      if(idx===0){
        const agH=5*3;
        borde(ML+rcC[0]+rcC[1]+rcC[2]+rcC[3],rcYInicio,rcC[4],agH);
        if(val.manejoAgresividad){ doc.setFontSize(7.5).setFont('helvetica','normal').setTextColor(...BLACK); doc.text(doc.splitTextToSize(val.manejoAgresividad,rcC[4]-3.6),ML+rcC[0]+rcC[1]+rcC[2]+rcC[3]+1.8,rcYInicio+4); }
      }
      y+=5;
    }); y+=2;

    // VIII. Sintomatología
    sec('VIII. SINTOMATOLOGIA EMOCIONAL');
    const sintH=42;
    check(sintH);
    const sW1=W*0.37, sW2=W*0.63;
    borde(ML,y,sW1,sintH); borde(ML+sW1,y,sW2,sintH);
    doc.setFontSize(7.8).setFont('helvetica','normal').setTextColor(...BLACK);
    [['sintomasBajaAutoestima','BAJA AUTOESTIMA'],['sintomasAnsiedad','ANSIEDAD'],['sintomasMiedo','MIEDO'],['sintomasEstres','ESTRES'],['sintomasDepresion','DEPRESION'],['sintomasTrastornoAlimentacion','TRASTORNO DE ALIMENTACION'],['sintomasTrastornoSueno','TRASTORNO DEL SUENO'],['sintomasDependenciaEmocional','DEPENDENCIA EMOCIONAL']].forEach(([k,lbl],i)=>{ doc.text(`${chk(val[k])} ${lbl}`,ML+2,y+5+i*4.6); });
    const xD=ML+sW1+2;
    doc.setFont('helvetica','bold'); doc.text('DESTREZAS Y HABILIDADES:',xD,y+5); doc.setFont('helvetica','normal');
    if(val.destrezasHabilidades) doc.text(doc.splitTextToSize(val.destrezasHabilidades,sW2-4),xD,y+9.5);
    doc.setFont('helvetica','bold'); doc.text('QUE ES LO QUE MAS DISFRUTAS HACER?',xD,y+19); doc.setFont('helvetica','normal');
    if(val.queDisfrutas) doc.text(doc.splitTextToSize(val.queDisfrutas,sW2-4),xD,y+23.5);
    doc.setFont('helvetica','bold'); doc.text('CUALES SON TUS FORTALEZAS?',xD,y+29); doc.setFont('helvetica','normal');
    if(val.fortalezas) doc.text(doc.splitTextToSize(val.fortalezas,sW2-4),xD,y+33.5);
    doc.setFont('helvetica','bold'); doc.text('DEPORTE QUE PRACTICAS:',xD,y+38.5); doc.setFont('helvetica','normal');
    doc.text(val.deportePractica||'',xD+38,y+38.5);
    y+=sintH+2;

    // IX. Actitud Social
    sec('IX.- ACTITUD SOCIAL');
    const asH=48;
    check(asH);
    const asC=[W*0.24,W*0.21,W*0.25,W*0.30];
    let xa=ML;
    asC.forEach(w=>{ borde(xa,y,w,asH); xa+=w; });
    doc.setFontSize(7.5).setFont('helvetica','normal').setTextColor(...BLACK);
    doc.setFont('helvetica','bold'); doc.text('METAS:',ML+2,y+5); doc.setFont('helvetica','normal');
    [['metasIncongruentes','INCONGRUENTES'],['metasSinProyectos','SIN PROYECTOS DEFINIDOS'],['metasImprovisadas','IMPROVISADAS'],['metasPracticas','PRACTICAS Y CONCRETAS'],['metasAlcanzables','ALCANZABLES'],['metasRealistas','REALISTAS']].forEach(([k,l],i)=>{ doc.text(`${chk(val[k])} ${l}`,ML+2,y+10+i*5.8); });
    const xCon=ML+asC[0]+2;
    doc.setFont('helvetica','bold'); doc.text('CONFLICTO CON LA',xCon,y+5); doc.text('AUTORIDAD',xCon,y+9); doc.setFont('helvetica','normal');
    [['conflictoExistentes','EXISTENTES'],['conflictoSituacionales','SITUACIONALES'],['conflictoNoExistente','NO EXISTENTE']].forEach(([k,l],i)=>{ doc.text(`${chk(val[k])} ${l}`,xCon,y+14+i*5.8); });
    const xInt=ML+asC[0]+asC[1]+2;
    doc.setFont('helvetica','bold'); doc.text('INTERACCION SOCIAL',xInt,y+5); doc.setFont('helvetica','normal');
    [['relacionesDependencia','DE DEPENDENCIA'],['relacionesUtilitarias','UTILITARIAS'],['relacionesExplotacion','DE EXPLOTACION'],['relacionesControl','DE CONTROL'],['sinInteresRelacionarse','SIN INTERES'],['relacionesProfundas','PROFUNDAS'],['relacionesEstables','ESTABLES']].forEach(([k,l],i)=>{ doc.text(`${chk(val[k])} ${l}`,xInt,y+10+i*5.3); });
    const xAnt=ML+asC[0]+asC[1]+asC[2]+2;
    doc.setFont('helvetica','bold'); doc.text('CONDUCTAS ANTISOCIALES:',xAnt,y+5); doc.setFont('helvetica','normal');
    if(val.conductasAntisociales) doc.text(doc.splitTextToSize(val.conductasAntisociales,asC[3]-4),xAnt,y+11);
    y+=asH+2;

    // X. Factores Psicosociales
    sec('X. FACTORES PSICOSOCIALES');
    const fH2=24;
    check(fH2);
    borde(ML,y,W,fH2);
    doc.setFontSize(7.8).setFont('helvetica','normal').setTextColor(...BLACK);
    doc.text(`HIJOS: ${val.hijos||'___'}`,ML+2,y+5);
    doc.text(`${chk(val.familiaNoApoya)} SU PROPIA FAMILIA NO LO APOYA   ${chk(val.noTrabaja)} NO TRABAJA   ${chk(val.noTieneVivienda)} NO TIENE VIVIENDA`,ML+2,y+10);
    doc.text(`${chk(val.revictimizacion)} RE VICTIMIZACION   ${chk(val.intentosSuicidio)} INTENTOS DE SUICIDIO   ${chk(val.tratamientoPsiquiatrico)} TRATAMIENTO PSIQUIATRICO`,ML+2,y+15);
    doc.text(`ADICCIONES: ${val.adicciones||''}`,ML+2,y+20);
    doc.text(`GRUPO DE PARES: ${val.grupoPares||'_______'}`,ML+W/2,y+20);
    if(val.otrosFactores) doc.text(`OTROS. ESPECIFIQUE: ${val.otrosFactores}`,ML+2,y+24);
    y+=fH2+2;

    // XI. Adicciones
    sec('XI. ADICCIONES');
    check(5);
    cell(ML,y,W*0.50,5,`USO SUST. PSICOACTIVAS: SI: ${val.usaSustancias==='SI'?'[X]':'[ ]'}  NO: ${val.usaSustancias==='NO'?'[X]':'[ ]'}`);
    cell(ML+W*0.50,y,W*0.50,5,`DESEA REHABILITARSE  SI: ${val.deseaRehabilitarse==='SI'?'[X]':'[ ]'}  NO: ${val.deseaRehabilitarse==='NO'?'[X]':'[ ]'}`);
    y+=5;
    check(5);
    const stC=[W*0.28,W*0.18,W*0.30,W*0.24];
    let xs=ML;
    ['SUSTANCIAS','EDAD DE INICIO','CANTIDAD/ FRECUENCIA','ULTIMO CONSUMO'].forEach((h,i)=>{ cell(xs,y,stC[i],5.5,h,true,GRAY,'center',8); xs+=stC[i]; }); y+=5.5;
    [...SUSTANCIAS,{etiqueta:'OTRA (S): especifique',claveEdad:'otraSustanciaEdad',claveCant:'otraSustanciaCantidad',claveUlt:'otraSustanciaUltimo'}].forEach(s=>{
      check(5); xs=ML;
      const lbl=s.etiqueta==='OTRA (S): especifique'?`OTRA(S): ${val.otraSustancia||''}`:s.etiqueta;
      [lbl,val[s.claveEdad]||'',val[s.claveCant]||'',val[s.claveUlt]||''].forEach((t,i)=>{ cell(xs,y,stC[i],5,t,i===0); xs+=stC[i]; }); y+=5;
    });
    check(5); cell(ML,y,W,5,`INTERNAMIENTOS: SI: ${val.internamientos==='SI'?'[X]':'[ ]'} NO: ${val.internamientos==='NO'?'[X]':'[ ]'}   TIEMPO SIN CONSUMO: ${val.tiempoSinConsumo||''}`); y+=5;
    check(5); cell(ML,y,W,5,`DELITO RELACIONADO A SUST.: SI: ${val.delitoPorSustancias==='SI'?'[X]':'[ ]'} NO: ${val.delitoPorSustancias==='NO'?'[X]':'[ ]'}   CUAL?: ${val.cualSustanciaDelito||''}`); y+=5+2;

    // XII. Dinámica Familiar
    sec('XII. DINAMICA FAMILIAR');
    const dinH=58; check(dinH); borde(ML,y,W,dinH);
    if(val.dinamicaFamiliar){ doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK); doc.text(doc.splitTextToSize(val.dinamicaFamiliar,W-3.6),ML+1.8,y+5); }
    y+=dinH+2;

    // XIII. Versión Subjetiva
    sec('XIII. VERSION SUBJETIVA DE LOS HECHOS (BREVE RELATO DE LA VINCULACION A PROCESO Y APREHENSION):');
    const vsH=58; check(vsH); borde(ML,y,W,vsH);
    if(val.versionSubjetiva){ doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK); doc.text(doc.splitTextToSize(val.versionSubjetiva,W-3.6),ML+1.8,y+5); }
    y+=vsH+2;

    // XIV. Observaciones
    sec('XIV. OBSERVACIONES GENERALES. Y RESULTADOS DE LAS PRUEBAS PSICOLOGICAS:');
    const obsH=52; check(obsH); borde(ML,y,W,obsH);
    if(val.observacionesGenerales){ doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK); doc.text(doc.splitTextToSize(val.observacionesGenerales,W-3.6),ML+1.8,y+5); }
    y+=obsH;
    check(32); borde(ML,y,W,30);
    doc.setFontSize(8).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text('RESULTADOS CUANTITATIVOS:',ML+2,y+5.5);
    doc.setFont('helvetica','normal');
    doc.text(`TEST ASSIT (ADICCIONES): ${val.resultadoAssit||''}`,ML+2,y+11);
    doc.text(`TEST. CUESTIONARIO DE AGRESIVIDAD AQ: ${val.resultadoAQ||''}`,ML+2,y+16.5);
    doc.text(`TEST CUESTIONARIO IPDE: ${val.resultadoIPDE||''}`,ML+2,y+22);
    doc.text(`TEST INVENTARIO DE DEPRESION RASGO - ESTADO (IDERE): ${val.resultadoIDERE||''}`,ML+2,y+27.5);
    y+=32;

    // XV. Acción Derivada
    sec('XV. ACCION DERIVADA DE LA ATENCION BRINDADA:');
    check(28); borde(ML,y,W,26);
    doc.setFontSize(8).setFont('helvetica','normal').setTextColor(...BLACK);
    doc.text(`SEGUIMIENTO PSICOLOGICO:   VOLUNTARIO: ${val.seguimiento==='VOLUNTARIO'?'[X]':'[ ]'}   NECESARIO: ${val.seguimiento==='NECESARIO'?'[X]':'[ ]'}`,ML+2,y+5.5);
    doc.text(`REFERENCIA PSIQUIATRICA: SI ${val.referenciaPsiquiatricaValor==='SI'?'[X]':'[ ]'} NO: ${val.referenciaPsiquiatricaValor==='NO'?'[X]':'[ ]'}   MOTIVO: ${val.referenciaPsiquiatricaMotivo||''}`,ML+2,y+11);
    doc.text(`REFERENCIA NEUROLOGICA:  SI ${val.referenciaNeurologicaValor==='SI'?'[X]':'[ ]'} NO: ${val.referenciaNeurologicaValor==='NO'?'[X]':'[ ]'}   MOTIVO: ${val.referenciaNeurologicaMotivo||''}`,ML+2,y+16.5);
    doc.text(`REFERENCIA A OTRO ESPECIALISTA: ${val.referenciaOtroEspecialista||''}   MOTIVO: ${val.referenciaOtroMotivo||''}`,ML+2,y+22);
    doc.text(`ACOMPANAMIENTO: ${val.acompanamiento||''}   CANALIZACION: ${val.canalizacion||''}`,ML+2,y+26);
    y+=28;

    // Notas
    sec('XV. NOTAS');
    const nota1Txt='NOTA 1. La informacion obtenida es unicamente para valoracion psicologica para el programa RECONECTA CON LA PAZ, por ello se realizara para complementacion un estudio integral, aclarando que el dato obtenido podria no ser enteramente coincidente con la version que obra en su expediente de ejecucion pues esta no es recabada con fines de investigacion criminal o de consideracion para una declaracion oficial.';
    const nota2Txt='NOTA GENERAL: "El presente documento es el resultado de una valoracion psicologica referida solo a las circunstancias concretas del contexto en que fue solicitado; por tanto, no debe utilizarse en casos ni momentos diferentes a este. Si se produjese una modificacion sustancial en alguna de las circunstancias consideradas procederia una nueva evaluacion". Munoz (2013, p.68)';
    doc.setFontSize(8).setFont('helvetica','normal');
    const n1L=doc.splitTextToSize(nota1Txt,W-3.6);
    const n2L=doc.splitTextToSize(nota2Txt,W-3.6);
    const notH=n1L.length*3.6+n2L.length*3.6+14;
    check(notH); borde(ML,y,W,notH);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica','bold'); doc.text('NOTA 1.',ML+2,y+5.5); doc.setFont('helvetica','normal');
    doc.text(doc.splitTextToSize(nota1Txt.replace('NOTA 1. ',''),W-22),ML+18,y+5.5);
    const yn2=y+5.5+n1L.length*3.6+4;
    doc.setFont('helvetica','bold'); doc.text('NOTA GENERAL:',ML+2,yn2); doc.setFont('helvetica','normal');
    doc.text(doc.splitTextToSize(nota2Txt.replace('NOTA GENERAL: ',''),W-30),ML+30,yn2);
    y+=notH+6;

    // Firma
    check(32);
    const firmaN=val.nombreFirmante||'LIC. PSIC. AVELINA ESCARCEGA PEREZ';
    const firmaC=val.cedFirmante||'6487612';
    doc.setFontSize(8).setFont('helvetica','bold');
    const nombreW=doc.getTextWidth(firmaN);
    const cedW=doc.getTextWidth(`CED. PROF. ${firmaC}`);
    const lineW=Math.max(nombreW,cedW)+10;
    const xFirma=PW/2-lineW/2;
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
    doc.line(xFirma,y+14,xFirma+lineW,y+14);
    doc.setFontSize(8).setFont('helvetica','bold').setTextColor(...BLACK);
    doc.text(firmaN,PW/2,y+19,{align:'center'});
    doc.setFont('helvetica','normal');
    doc.text(`CED. PROF. ${firmaC}`,PW/2,y+24,{align:'center'});

    const total=(doc.internal as any).getNumberOfPages();
    for(let p=1;p<=total;p++){
      doc.setPage(p);
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(120,120,120);
      doc.text(`${p}`,PW/2,PH-5,{align:'center'});
    }
    return doc;
  }

  // ── Descarga del PDF ──────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════
  //  GUARDAR EN HISTORIAL + BACKEND
  //  1. Genera el PDF y lo agrega al historial local.
  //  2. Construye el JSON estructurado y lo envía al backend.
  //  3. Descarga ZIP organizado.
  // ════════════════════════════════════════════════════════════════
  guardarEnHistorial() {
  console.log('💾 Guardando Valoración Psicológica');

  const psicologoId = this.session.getUserId();

  console.log('🧠 Payload JWT:', this.session.getPayload());

  if (!psicologoId) {
    console.warn('⚠️ No se pudo obtener el ID del psicólogo');
    this.mostrarToast('Error: sesión inválida', 'error');
    return;
  }

  if (!this.expediente?.id) {
    this.mostrarToast('Error: expediente no encontrado', 'error');
    return;
  }

  const payload = {
    expedienteId: this.expediente.id,
    psicologoId: psicologoId,
    fechaEstudio: new Date().toISOString(),
    motivoValoracion: 'Inclusion al programa "RECONECTA CON LA PAZ."',
    seccionesJsonb: this.formGroup.value,
    observacionesGenerales: this.formGroup.value.observacionesGenerales,
    resultadosPruebas: {},
    accionDerivada: {}
  };

  console.log('📤 Payload FINAL:', payload);

  this.penalService.saveValoracionPsicologica(payload)
    .subscribe({
      next: (res) => {
        console.log('✅ Guardado correctamente:', res);
        // manda a componente de deatlle penal
        this.router.navigate(['/detalle-penal', this.expediente?.id], { state: { valoracionGuardada: true } });
        this.mostrarToast('Guardado correctamente');
      },
      error: (err) => {
        console.error('❌ Error backend:', err);

        if (err.status === 404) {
          this.mostrarToast('Error 404: ruta incorrecta', 'error');
        } else if (err.status === 401) {
          this.mostrarToast('No autorizado (token)', 'error');
        } else if (err.status === 409) {
          this.mostrarToast('Ya existe valoración', 'error');
          this.router.navigate(['/detalle-penal', this.expediente?.id], { state: { valoracionGuardada: true } });
        } else {
          this.mostrarToast('Error al guardar', 'error');
        }
      }
    });
}

  // ════════════════════════════════════════════════════════════════
  //  CONSTRUIR PAYLOAD PARA EL BACKEND
  //  Mapea el formulario al JSON esperado por /penal/valoracion-psicologica
  // ════════════════════════════════════════════════════════════════
  private _construirPayloadBackend(val: any, expId: string): any {
    // ── IDs requeridos por el DTO del backend (deben ser number, nunca null) ──
    // expedienteId: viene del objeto expediente cargado en ngOnInit
    const expedienteId: number = Number(
      this.expediente?.id ??
      this.expediente?.expedienteId ??
      this.expediente?.expediente_id ??
      0
    );

    // psicologoId: el backend valida @IsInt().
    // Se toma en este orden: expediente.psicologoId → usuario en sesión → 0 (fallback log)
    const sessionUser = JSON.parse(
      localStorage.getItem('user') ??
      sessionStorage.getItem('user') ??
      '{}'
    );
    const psicologoId: number = Number(
      this.expediente?.psicologoId ??
      this.expediente?.psicologo_id ??
      sessionUser?.id ??
      0
    );

    if (!expedienteId) console.warn('⚠️ expedienteId es 0 — revisa que this.expediente tenga la propiedad "id"');
    if (!psicologoId)  console.warn('⚠️ psicologoId es 0 — revisa que el usuario esté en localStorage/sessionStorage con clave "user"');

    return {
      expedienteId,
      psicologoId,
      fechaEstudio:         val.fechaEstudio || new Date().toISOString().split('T')[0],
      motivoValoracion:     'Inclusion al programa "RECONECTA CON LA PAZ."',

      seccionesJsonb: {
        metodologia: [
          'CONSENTIMIENTO INFORMADO', 'ENTREVISTA CLINICA PSICOLOGICA',
          'OBSERVACION DIRECTA', 'EXAMEN COGNOSCITIVO MINI-MENTAL (MOCA)',
          'TEST PERSONA BAJO LA LLUVIA', 'TEST ASSIT (ADICCIONES)',
          'TEST INVENTARIO DE DEPRESION Y ANSIEDAD DE BECK',
          'TEST. CUESTIONARIO DE AGRESIVIDAD AQ', 'TEST CUESTIONARIO IPDE',
        ],

        datos_generales: {
          nombre:             val.nombre,
          edad:               val.edad,
          sobreNombre:        val.sobreNombre,
          fechaNacimiento:    val.fechaNacimiento,
          lugarNacimiento:    val.lugarNacimiento,
          estadoCivil:        val.estadoCivil,
          domicilio:          val.domicilio,
          religion:           val.religion,
          orientacionSexual:  val.orientacionSexual,
          escolaridad:        val.nivelEscolaridad,
          ocupacion:          val.ocupacionActual,
          lenguaMaterna:      val.lenguaMaterna,
          situacionJuridica:  val.situacionJuridica,
          contactoEmergencia: val.contactoEmergencia,
        },

        apariencia: {
          edadAparente:     val.edadAparente,
          higiene:          val.higiene,
          arreglo:          val.arreglo,
          lesionesRecientes:val.lesionesRecientes,
          cualesLesiones:   val.cualesLesiones,
          motivoLesiones:   val.motivoLesiones,
          tatuajes:         val.tatuajes,
          descripcionFisica:val.descripcionFisica,
        },

        actitud_entrevista: {
          respeta:             val.actitudRespeta,
          sigueInstrucciones:  val.actitudSigueInstrucciones,
          agresivo:            val.actitudAgresivo,
          seductor:            val.actitudSeductor,
          colabora:            val.actitudColabora,
          concreto:            val.actitudConcreto,
          indiferente:         val.actitudIndiferente,
          manipulador:         val.actitudManipulador,
          estadoAnimo:         val.estadoAnimo,
          otra:                val.otraActitud,
        },

        examen_mental: {
          conciencia:          val.conciencia,
          orientacion: { tiempo: val.orientacionTiempo, persona: val.orientacionPersona, espacio: val.orientacionEspacio, observaciones: val.orientacionObservaciones },
          memoria:     { conservada: val.memoriaConservada, disminuida: val.memoriaDisminuida, observaciones: val.memoriaObservaciones },
          atencion:    { dispersa: val.atencionDispersa, concentrada: val.atencionConcentrada, observaciones: val.atencionObservaciones },
          sensopercepcion: { adecuada: val.sensopercepcionAdecuada, alterada: val.sensopercepcionAlterada, observaciones: val.sensopercepcionObservaciones },
          contenido:   { logico: val.contenidoLogico, coherente: val.contenidoCoherente, congruente: val.contenidoCongruente, inductivo: val.contenidoInductivo, deductivo: val.contenidoDeductivo, incongruente: val.contenidoIncongruente },
          nivelPensamiento: { concreto: val.nivelPensamientoConcreto, funcional: val.nivelPensamientoFuncional, abstracto: val.nivelPensamientoAbstracto, observaciones: val.nivelPensamientoObservaciones },
          lenguaje:    { normal: val.lenguajeNormal, rapido: val.lenguajeRapido, lento: val.lenguajeLento, claro: val.lenguajeClaro, tecnico: val.lenguajeTecnico },
        },

        rendimiento_intelectual: {
          juicio:       val.capacidadJuicio,
          analisis:     val.capacidadAnalisis,
          sintesis:     val.capacidadSintesis,
          planeacion:   val.capacidadPlaneacion,
          organizacion: val.capacidadOrganizacion,
        },

        rasgos_caracter: {
          toleranciaFrustracion: val.toleranciaFrustracion,
          capacidadDemora:       val.capacidadDemora,
          controlImpulsos:       val.controlImpulsos,
          manejoAgresividad:     val.manejoAgresividad,
        },

        sintomatologia_emocional: {
          bajaAutoestima:         val.sintomasBajaAutoestima,
          ansiedad:               val.sintomasAnsiedad,
          miedo:                  val.sintomasMiedo,
          estres:                 val.sintomasEstres,
          depresion:              val.sintomasDepresion,
          trastornoAlimentacion:  val.sintomasTrastornoAlimentacion,
          trastornoSueno:         val.sintomasTrastornoSueno,
          dependenciaEmocional:   val.sintomasDependenciaEmocional,
          destrezasHabilidades:   val.destrezasHabilidades,
          queDisfrutas:           val.queDisfrutas,
          fortalezas:             val.fortalezas,
          deportePractica:        val.deportePractica,
        },

        actitud_social: {
          metas: { incongruentes: val.metasIncongruentes, sinProyectos: val.metasSinProyectos, improvisadas: val.metasImprovisadas, practicas: val.metasPracticas, alcanzables: val.metasAlcanzables, realistas: val.metasRealistas },
          conflictoAutoridad: { existentes: val.conflictoExistentes, situacionales: val.conflictoSituacionales, noExistente: val.conflictoNoExistente },
          interaccionSocial: { dependencia: val.relacionesDependencia, utilitarias: val.relacionesUtilitarias, explotacion: val.relacionesExplotacion, control: val.relacionesControl, sinInteres: val.sinInteresRelacionarse, profundas: val.relacionesProfundas, estables: val.relacionesEstables },
          conductasAntisociales: val.conductasAntisociales,
        },

        factores_psicosociales: {
          hijos:                  val.hijos,
          familiaNoApoya:         val.familiaNoApoya,
          noTrabaja:              val.noTrabaja,
          noTieneVivienda:        val.noTieneVivienda,
          revictimizacion:        val.revictimizacion,
          intentosSuicidio:       val.intentosSuicidio,
          tratamientoPsiquiatrico:val.tratamientoPsiquiatrico,
          adicciones:             val.adicciones,
          grupoPares:             val.grupoPares,
          otrosFactores:          val.otrosFactores,
        },

        adicciones: {
          usaSustancias:     val.usaSustancias,
          deseaRehabilitarse:val.deseaRehabilitarse,
          sustancias: SUSTANCIAS.map(s => ({
            nombre:    s.etiqueta,
            edadInicio:val[s.claveEdad]   || null,
            cantidad:  val[s.claveCant]   || null,
            ultimoConsumo: val[s.claveUlt] || null,
          })),
          otraSustancia:      val.otraSustancia,
          otraSustanciaEdad:  val.otraSustanciaEdad,
          otraSustanciaCant:  val.otraSustanciaCantidad,
          otraSustanciaUlt:   val.otraSustanciaUltimo,
          internamientos:     val.internamientos,
          tiempoSinConsumo:   val.tiempoSinConsumo,
          delitoPorSustancias:val.delitoPorSustancias,
          cualSustanciaDelito:val.cualSustanciaDelito,
        },

        dinamica_familiar:   val.dinamicaFamiliar,
        version_subjetiva:   val.versionSubjetiva,
      },

      observacionesGenerales: val.observacionesGenerales,

      resultadosPruebas: {
        assit:val.resultadoAssit,
        aq:   val.resultadoAQ,
        ipde: val.resultadoIPDE,
        idere:val.resultadoIDERE,
      },

      accionDerivada: {
        seguimiento:              val.seguimiento,
        referenciaPsiquiatrica:   { valor: val.referenciaPsiquiatricaValor, motivo: val.referenciaPsiquiatricaMotivo },
        referenciaNeurologica:    { valor: val.referenciaNeurologicaValor,  motivo: val.referenciaNeurologicaMotivo },
        referenciaOtroEspecialista:{ especialista: val.referenciaOtroEspecialista, motivo: val.referenciaOtroMotivo },
        acompanamiento:           val.acompanamiento,
        canalizacion:             val.canalizacion,
      },

      firmante: {
        nombre: val.nombreFirmante,
        cedula: val.cedFirmante,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  HISTORIAL + ZIP
  // ════════════════════════════════════════════════════════════════
  private _cargarJsZip(): Promise<void> {
    return new Promise((ok, err) => {
      if ((window as any).JSZip) return ok();
      const s = Object.assign(document.createElement('script'), {
        id: 'jszip-cdn',
        src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      });
      s.onload = () => ok();
      s.onerror = () => err(new Error('No se pudo cargar JSZip'));
      document.head.appendChild(s);
    });
  }

  private _dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private _sanitizar(s: any): string {
    // Coerce to string — evita "s.replace is not a function" cuando llega un número o null
    return String(s ?? '').replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim();
  }

  async descargarComoCareta(entrada: EntradaHistorial): Promise<void> {
    this.estadoPdf.set({ activo:true, pct:10, fase:'Preparando carpeta...', exito:false, error:'' });
    try {
      await this._cargarJsZip();
      this.estadoPdf.update(s => ({ ...s, pct:40, fase:'Empaquetando archivos...' }));
      const JSZip = (window as any).JSZip;
      const zip   = new JSZip();
      const carpetaRaiz = this._sanitizar(entrada.expediente);
      const ruta = `${carpetaRaiz}/${entrada.fecha.replace(/\//g, '-')}_VALORACION-CLINICA-PSICOLOGICA/`;
      zip.file(`${ruta}${this._sanitizar(entrada.pdf.nombre)}`, this._dataUrlToUint8Array(entrada.pdf.dataUrl));
      for (const archivo of entrada.archivos) { zip.file(`${ruta}${this._sanitizar(archivo.nombre)}`, this._dataUrlToUint8Array(archivo.dataUrl)); }
      this.estadoPdf.update(s => ({ ...s, pct:75, fase:'Generando ZIP...' }));
      const blob: Blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = `${carpetaRaiz}.zip`; a.click();
      URL.revokeObjectURL(url);
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Carpeta descargada!', exito:true }));
      setTimeout(() => { this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' }); this.mostrarToast(`Carpeta ${carpetaRaiz} descargada`); }, 2200);
    } catch (e: any) {
      this.estadoPdf.update(s => ({ ...s, pct:100, fase:'Error al crear carpeta', error: e?.message||'' }));
      setTimeout(() => { this.estadoPdf.set({ activo:false, pct:0, fase:'', exito:false, error:'' }); this.mostrarToast('Error al crear la carpeta', 'error'); }, 2200);
    }
  }

  eliminarExpediente(id:number):void { this.historial.update(p=>p.filter(e=>e.id!==id)); this.mostrarToast('Expediente eliminado'); }
  descargarPdfHistorial(e:EntradaHistorial):void { this._dl(e.pdf.dataUrl, e.pdf.nombre); }
  descargarExpedienteCompleto(e:EntradaHistorial):void { this.descargarComoCareta(e); }
  descargarArchivo(a:ArchivoAdjunto):void { this._dl(a.dataUrl, a.nombre); }
  private _dl(url:string, name:string):void { Object.assign(document.createElement('a'),{href:url,download:name}).click(); }
  regresarPantallaAnterior():void { this.router.navigate(['/seleccion']); }
  irATrabajoSocial():void { this.router.navigate(['/trabajo-social']); }
  cerrarSesion():void { alert('Sesion cerrada.\n(TODO: integrar con AuthService + Router)'); }

  // ── Helpers para el template ──────────────────────────────────
  v(k:string):any { return this._form?.get(k)?.value; }
  ch(v:boolean):string { return v?'[X]':'[ ]'; }
  dot(a:string, b:string):string { return a===b?'(*)':'( )'; }
  chkPdf(v:boolean):string { return v?'[X]':'[ ]'; }
  dotPdf(a:string, b:string):string { return a===b?'(*)':'( )'; }
  iconoArchivo(t:string):string { return t?.includes('pdf')?'📄':t?.includes('image')?'🖼️':'📝'; }
  truncar(n:string, m=20):string { return n.length>m?n.slice(0,m-3)+'...':n; }
}