import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-guia-tabs',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule
  ],
  templateUrl: './guia-tabs.html',
  styleUrl: './guia-tabs.css'
})
export class GuiaTabsComponent implements OnInit {
  @Input() expediente: any;

  // Enums del Backend
  readonly VALORES_ASISTENCIA = ['PRESENTE', 'FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'PRESENTE_PARCIAL'];
  readonly VALORES_INCIDENCIA = [
    'FALTA_INJUSTIFICADA', 'RETARDO', 'CONDUCTA_INAPROPIADA', 
    'INCUMPLIMIENTO_TAREA', 'INASISTENCIA_JUSTIFICADA', 
    'VISITA_DOMICILIARIA', 'RETIRO_ANTICIPADO', 'CONVERSATORIO'
  ];

  tabActual: 'horas' | 'inasistencias' | 'asistencia' = 'horas';

  // Lógica bitácora unificada
  mostrarModalBitacora: boolean = false;
  bitacoraForm!: FormGroup;
  previewUrl: string | null = null;
  inasistenciasForm!: FormGroup; // Se mantiene por retrocompatibilidad temporal o se puede eliminar
  listaInasistencias: any[] = [];

  // Lógica asistencia / horas
  listaAsistencia = [
    { id: 1, horario: '10:00 - 12:00', actividad: 'Plática de integración', sede: 'Auditorio Municipal', horasCubiertas: 2 }
  ];
  planTrabajo: string = 'Plan Nacional Universitario';
  fechaPlan: string = '';
  observacionesPlan: string = '';
  registrosHoras: any[] = [];
  horasTotalesAsignadas: number = 25;

  // NUEVO: Dashboard de progreso y strikes (RF-011, RF-013)
  resumenHoras: { horasAcumuladas: number, horasSentencia: number, porcentajeAvance: number } = {
    horasAcumuladas: 0,
    horasSentencia: 0,
    porcentajeAvance: 0
  };
  totalFaltas: number = 0;
  estadoBaja: boolean = false;

  // NOTIFICACIONES IN-APP (MIGRADO A GLOBAL)
  registroEliminar: any = null;

  // Lógica de Selección para Reportes (Frontend-Only)
  idsSeleccionados: Set<any> = new Set();

  constructor(
    private fb: FormBuilder,
    private civico: Civico,
    private session: SessionService,
    private toast: ToastService
  ) {
    this.horasTotalesAsignadas = 25;
    this.initForms();
  }

  private initForms() {
    // Formulario de Bitácora Unificado (RF-011, RF-013)
    this.bitacoraForm = this.fb.group({
      fechaActividad: [new Date().toISOString().split('T')[0], Validators.required],
      horasCubiertas: [0, [Validators.required, Validators.min(0), Validators.max(8)]],
      asistencia: ['', Validators.required],
      incidencia: [null],
      detalleIncidencia: [''],
      sede: [''],
      observaciones: [''],
      evidenciaUrl: [''],
      actividadId: [1] // Default o dinámico
    });

    // Mantener inasistenciasForm por si se usa en modal viejo
    this.inasistenciasForm = this.fb.group({
      tipo: ['', Validators.required],
      descripcion: ['', Validators.required],
      fecha: ['', Validators.required],
    });
  }

  get esAdmin(): boolean { return this.session.esAdmin(); }
  get esGuia(): boolean { return this.session.esGuia(); }
  get puedeRegistrar(): boolean { return this.esGuia; } // Admin solo visualiza

  // MÉTODOS DE SELECCIÓN
  toggleSeleccion(reg: any) {
    const id = reg.idUUID || reg.id;
    if (this.idsSeleccionados.has(id)) {
      this.idsSeleccionados.delete(id);
    } else {
      this.idsSeleccionados.add(id);
    }
  }

  estaSeleccionado(reg: any): boolean {
    return this.idsSeleccionados.has(reg.idUUID || reg.id);
  }

  get haySeleccionados(): boolean {
    return this.idsSeleccionados.size > 0;
  }

  seleccionarTodoToggle() {
    if (this.haySeleccionados && this.idsSeleccionados.size === this.registrosHoras.length) {
      this.idsSeleccionados.clear();
    } else {
      this.registrosHoras.forEach((r: any) => this.idsSeleccionados.add(r.idUUID || r.id));
    }
  }

  get horasRestantes(): number {
    const faltan = this.resumenHoras.horasSentencia - this.resumenHoras.horasAcumuladas;
    return faltan > 0 ? faltan : 0;
  }

  get estaCompletado(): boolean {
    return this.resumenHoras.porcentajeAvance >= 100;
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.expediente) return;
    const id = this.expediente.idUUID || this.expediente.id;
    
    // Asegurar que horas totales estén sincronizadas desde el inicio
    const horasSentencia = Number(this.expediente.horasSentencia || 0);
    this.resumenHoras.horasSentencia = horasSentencia;
    this.horasTotalesAsignadas = horasSentencia;

    // 1. Cargar Bitácora y Calcular todo localmente para mayor fiabilidad
    this.civico.obtenerBitacoraPorExpediente(id).subscribe({
      next: (res: any[]) => {
        this.registrosHoras = res?.length ? res : [];
        console.log("BITÁCORA LOADED:", this.registrosHoras);
        if (res?.length) console.table(this.registrosHoras); // 📸 Ver las columnas reales de la bitácora
        
        // Calcular faltas (strikes)
        this.totalFaltas = this.registrosHoras.filter((r: any) => r.asistencia === 'FALTA_INJUSTIFICADA').length;
        this.estadoBaja = this.totalFaltas >= 3;

        // Calcular progreso local
        this.calcularResumenLocal();
      },
      error: (err) => {
        console.error("Error cargando bitácora:", err);
        this.registrosHoras = [];
      }
    });

    // 2. Cargar Incidencias (Opcional si ya se traen en bitácora, pero se mantiene por ahora)
    this.civico.obtenerIncidenciasPorExpediente(id).subscribe({
      next: (res: any[]) => this.listaInasistencias = res?.length ? res : [],
      error: () => this.listaInasistencias = []
    });

    // 3. Intentar cargar resumen del backend (como respaldo/verificación)
    this.civico.obtenerResumenHorasBitacora(id).subscribe({
      next: (res) => {
        if (res && res.horasSentencia > 0) {
           // Si el backend trae algo válido, lo tomamos
           this.resumenHoras = res;
        } else {
           // Si no, recalculamos local
           this.calcularResumenLocal();
        }
      },
      error: () => this.calcularResumenLocal()
    });
  }

  private calcularResumenLocal() {
    const acumuladas = this.registrosHoras.reduce((acc, reg) => acc + Number(reg.horasCubiertas || 0), 0);
    const sentencia = Number(this.resumenHoras.horasSentencia || this.expediente?.horasSentencia || 0);
    
    this.resumenHoras.horasAcumuladas = acumuladas;
    this.resumenHoras.horasSentencia = sentencia;
    
    if (sentencia > 0) {
      this.resumenHoras.porcentajeAvance = Math.round((acumuladas / sentencia) * 100);
    } else {
      this.resumenHoras.porcentajeAvance = 0;
    }
  }

  cambiarTab(tab: 'horas' | 'inasistencias' | 'asistencia') {
    this.tabActual = tab;
  }

  // ==== CALCULOS HORAS ====
  obtenerAcumuladas(index: number): number {
    let sum = 0;
    for (let i = 0; i <= index; i++) {
        sum += Number(this.registrosHoras[i]?.horasCubiertas || 0);
    }
    return sum;
  }

  obtenerRestantes(index: number): number {
    return this.horasTotalesAsignadas - this.obtenerAcumuladas(index);
  }

  agregarRegistroHora() {
    this.registrosHoras.push({
      id: Date.now(),
      fechaActividad: new Date().toISOString().split('T')[0],
      actividad: 'Nueva Actividad',
      horasCubiertas: 0,
      asistencia: 'PRESENTE'
    });
  }

  // ==== ASISTENCIAS ====
  agregarFilaAsistencia() {
    this.listaAsistencia.push({
      id: Date.now(),
      horario: '',
      actividad: '',
      sede: '',
      horasCubiertas: 0
    });
  }

  eliminarFilaAsistencia(id: number) {
    this.listaAsistencia = this.listaAsistencia.filter((f: any) => f.id !== id);
  }

  guardarBitacora() {
    if (this.bitacoraForm.invalid) {
      this.bitacoraForm.markAllAsTouched();
      return;
    }

    const value = this.bitacoraForm.value;
    const payload = {
      ...value,
      expedienteId: this.expediente.idUUID || this.expediente.id,
      guiaId: Number(this.session.getUserId() || 1),
      horasCubiertas: Number(value.horasCubiertas)
    };

    console.log('🚀 ENVIANDO BITÁCORA AL BACKEND:', payload);

    this.civico.registrarBitacora(payload).subscribe({
      next: () => {
        this.toast.showSuccess("Registro de bitácora guardado correctamente.");
        this.cerrarModalBitacora();
        this.cargarDatos();
      },
      error: (err: any) => {
        const msg = err.error?.message || "Error al registrar asistencia";
        this.toast.showError("Atención: " + msg);
      }
    });
  }

  // MIGRACIÓN: Se eliminó mostrarMensaje local en favor de ToastService global.


  eliminarRegistro(reg: any) {
    this.registroEliminar = reg;
  }

  confirmarEliminarDefinitivo() {
    if (!this.registroEliminar) return;
    const id = this.registroEliminar.idUUID || this.registroEliminar.id;

    console.log("DELETING BITACORA REG:", id);
    if (!id) {
      this.toast.showError("Error: ID del registro no encontrado.");
      this.registroEliminar = null;
      return;
    }

    this.civico.eliminarRegistroBitacora(id).subscribe({
      next: () => {
        this.toast.showSuccess("Registro eliminado exitosamente.");
        this.registroEliminar = null;
        this.cargarDatos(); 
      },
      error: (err: any) => {
        this.toast.showError("Error al eliminar: " + (err.error?.message || err.message));
        this.registroEliminar = null;
      }
    });
  }

  abrirModalBitacora() {
    this.bitacoraForm.reset({
      fechaActividad: new Date().toISOString().split('T')[0],
      horasCubiertas: 0,
      asistencia: '',
      actividadId: 1
    });
    this.mostrarModalBitacora = true;
  }

  cerrarModalBitacora() {
    this.mostrarModalBitacora = false;
  }

  // Se utilizará un enlace directo a Drive para evidencia

  descargarPDF(tipo: string) {
    if (!this.expediente) return;
    const expId = this.expediente.idUUID || this.expediente.id;

    // Mapa de nombres legibles para el archivo
    const nombres: any = {
      'lista-asistencia': 'Plantilla_Asistencia',
      'ficha-incidencias': 'Ficha_Incidencias',
      'reporte-semanal': 'Plantilla_Reporte_Semanal'
    };

    // Si es el registro + PDF de asistencia (proceso híbrido existente)
    if (tipo === 'registro-asistencia') {
      const payload = {
        expedienteId: expId,
        fecha: new Date().toISOString().split('T')[0],
        horasCubiertas: 0,
        asistencia: "PRESENTE",
        horario: "N/A",
        sede: "N/A",
        actividadNombre: "Generación Documento PDF",
        observaciones: "Descarga de lista"
      };
      this.civico.registrarAsistenciaYGenerarPDF(payload).subscribe({
        next: (blob) => this.abrirBlob(blob, 'Lista_Asistencia_Registro'),
        error: (err) => {
          let msg = err.error?.message || err.message;
          if (Array.isArray(msg)) msg = msg.join(', ');
          alert(`Aún no se puede realizar esta acción: ${msg}`);
        }
      });
      return;
    }

    // Para los de tipo GET simple (Plantillas y Fichas)
    this.toast.showSuccess(`Iniciando descarga de ${nombres[tipo] || 'documento'}...`);
    this.civico.generarDocumentoPDF(tipo, expId).subscribe({
      next: (blob) => this.abrirBlob(blob, nombres[tipo] || tipo),
      error: (err) => {
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        this.toast.showError(`Error en descarga: ${msg}`);
      }
    });
  }

  /**
   * Genera el reporte semanal automáticamente tomando los registros de los últimos 7 días.
   */
  descargarReporteSemanalAuto() {
    if (!this.registrosHoras || this.registrosHoras.length === 0) {
      this.toast.showError("No hay registros recientes para generar un reporte.");
      return;
    }

    // Definimos "una semana" como los registros de los últimos 7 días con actividad
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

    const seleccion = this.registrosHoras
      .filter((r: any) => new Date(r.fechaActividad) >= haceUnaSemana)
      .sort((a, b) => new Date(a.fechaActividad).getTime() - new Date(b.fechaActividad).getTime());

    // Si no hay en los últimos 7 días, tomamos los últimos 5 registros por defecto
    const rFinales = seleccion.length > 0 ? seleccion : this.registrosHoras.slice(0, 5);
    
    this.toast.showSuccess("Generando reporte semanal automático...");
    this.generarReporteConsolidado(rFinales, "Reporte_Semanal_Automatico");
  }

  /**
   * Genera el reporte semanal utilizando una selección específica de registros.
   */
  descargarReporteSeleccionado() {
    if (!this.haySeleccionados) return;
    this.toast.showSuccess(`Generando reporte de ${this.idsSeleccionados.size} registros...`);
    const seleccion = this.registrosHoras
      .filter((r: any) => this.estaSeleccionado(r))
      .sort((a, b) => new Date(a.fechaActividad).getTime() - new Date(b.fechaActividad).getTime());

    this.generarReporteConsolidado(seleccion, "Reporte_Personalizado_Seleccion");
  }

  private generarReporteConsolidado(seleccion: any[], nombreArchivo: string) {
    const expId = this.expediente.idUUID || this.expediente.id;
    if (seleccion.length === 0) return;

    const fechaInicio = seleccion[0].fechaActividad;
    const fechaFin = seleccion[seleccion.length - 1].fechaActividad;

    const payload = {
      expedienteId: expId,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      semanaNumero: 1,
      observaciones: "Reporte generado automáticamente por el sistema.",
      renglones: seleccion.map((s: any) => ({
        asistencia: s.asistencia,
        fecha: s.fechaActividad,
        descripcion: s.detalleIncidencia || s.observaciones || 'Actividad de seguimiento'
      }))
    };

    this.civico.generarDocumentoPDFPost('reporte-semanal', payload).subscribe({
      next: (blob) => this.abrirBlob(blob, nombreArchivo),
      error: (err) => {
        let msg = err.error?.message || err.message;
        alert(`Error al generar reporte: ${msg}`);
      }
    });
  }

  /**
   * Genera el PDF de Asistencia (Hoja individual) para cada registro seleccionado.
   * IMPORTANTE: No enviamos expedienteId para evitar que el backend cree duplicados en la BD,
   * enviamos los datos descriptivos directamente.
   */
  descargarAsistenciaSeleccionada() {
    if (!this.haySeleccionados) return;
    
    const seleccion = this.registrosHoras.filter((r: any) => this.estaSeleccionado(r));
    if (seleccion.length === 0) return;

    this.toast.showSuccess(`Generando ${seleccion.length} hoja(s) de asistencia rellenada(s)...`);

    const nombreBen = this.expediente.beneficiario?.nombre?.toUpperCase() || 'BENEFICIARIO';
    const guiaNombre = seleccion[0].guia?.nombre?.toUpperCase() || '—';

    // Generamos uno por cada seleccionados (el template es por sesión)
    seleccion.forEach((reg, index) => {
      // Iniciales para firma
      const iniciales = nombreBen.split(/\s+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join('');
      const fechaLimpia = reg.fechaActividad ? reg.fechaActividad.split('T')[0] : '';

      const payload = {
        // expedienteId: OMITIDO para no guardar duplicado en BD
        nombreBeneficiario: nombreBen,
        nombreGuia: guiaNombre,
        fecha: fechaLimpia,        // Campo estándar
        fechaHoja: fechaLimpia,    // Campo alternativo en template
        observaciones: reg.observaciones || '',
        actividades: [
          {
            horario: reg.horasCubiertas ? `${reg.horasCubiertas} HORAS` : '—',
            actividad: reg.detalleIncidencia || reg.observaciones || 'Actividad de seguimiento',
            sede: reg.sede || '—',
            firma: iniciales,
            asistencia: reg.asistencia || '—',
            evidenciaUrl: reg.evidenciaUrl || ''
          }
        ]
      };

      console.log(`🚀 GENERANDO HOJA ASISTENCIA RELLENA [${index+1}]:`, payload);

      this.civico.generarDocumentoPDFPost('lista-asistencia', payload).subscribe({
        next: (blob) => this.abrirBlob(blob, `Asistencia_Rellena_${index+1}`),
        error: (err) => console.error("Error al generar hoja de asistencia:", err)
      });
    });

    if (seleccion.length > 2) {
      this.toast.showSuccess("Se están descargando varios documentos. Verifique las descargas de su navegador.");
    }
  }

  private abrirBlob(blob: Blob, nombre: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Convertir nombre a algo muy descriptivo según el contexto
    let prefijo = nombre;
    if (nombre.includes('Asistencia_Rellena')) prefijo = 'HOJA_ASISTENCIA_INDIVIDUAL';
    if (nombre.includes('Reporte_Personalizado')) prefijo = 'REPORTE_SEMANAL_CONSOLIDADO';

    const nombreReal = `${prefijo}_${this.expediente.beneficiario?.nombre || 'Doc'}.pdf`;
    
    a.download = nombreReal;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

