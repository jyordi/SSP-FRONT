import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';

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

  constructor(
    private fb: FormBuilder,
    private civico: Civico,
    private session: SessionService
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

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.expediente) return;
    const id = this.expediente.idUUID || this.expediente.id;
    if (this.expediente.horasSentencia) {
        this.horasTotalesAsignadas = this.expediente.horasSentencia;
    }

    this.civico.obtenerBitacoraPorExpediente(id).subscribe({
      next: (res: any[]) => this.registrosHoras = res?.length ? res : [],
      error: () => this.registrosHoras = []
    });

    this.civico.obtenerIncidenciasPorExpediente(id).subscribe({
      next: (res: any[]) => this.listaInasistencias = res?.length ? res : [],
      error: () => this.listaInasistencias = []
    });

    // Cargar resumen de horas oficial del backend
    this.civico.obtenerResumenHorasBitacora(id).subscribe({
      next: (res) => {
        this.resumenHoras = res;
      },
      error: (err) => console.error("Error cargando resumen de horas:", err)
    });

    // Calcular strikes (Feltas Injustificadas)
    this.civico.obtenerBitacoraPorExpediente(id).subscribe({
      next: (res: any[]) => {
        this.registrosHoras = res;
        this.totalFaltas = res.filter(r => r.asistencia === 'FALTA_INJUSTIFICADA').length;
        this.estadoBaja = this.totalFaltas >= 3;
      }
    });
  }

  cambiarTab(tab: 'horas' | 'inasistencias' | 'asistencia') {
    this.tabActual = tab;
  }

  // ==== CALCULOS HORAS ====
  obtenerAcumuladas(index: number): number {
    let sum = 0;
    for (let i = 0; i <= index; i++) {
        sum += Number(this.registrosHoras[i]?.horas || 0);
    }
    return sum;
  }

  obtenerRestantes(index: number): number {
    return this.horasTotalesAsignadas - this.obtenerAcumuladas(index);
  }

  agregarRegistroHora() {
    this.registrosHoras.push({
      id: Date.now(),
      fecha: new Date().toLocaleDateString(),
      actividad: 'Nueva Actividad',
      horas: 0,
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
    this.listaAsistencia = this.listaAsistencia.filter(f => f.id !== id);
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

    this.civico.registrarBitacora(payload).subscribe({
      next: () => {
        alert("Registro de bitácora guardado correctamente.");
        this.cerrarModalBitacora();
        this.cargarDatos();
      },
      error: (err: any) => {
        const msg = err.error?.message || "Error al registrar asistencia";
        alert("Atención: " + msg);
      }
    });
  }

  eliminarRegistro(id: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de la bitácora? Esto afectará el cálculo de horas.')) return;

    this.civico.eliminarRegistroBitacora(id).subscribe({
      next: () => {
        alert("Registro eliminado exitosamente.");
        this.cargarDatos(); // Recargar la bitácora y los recálculos
      },
      error: (err: any) => {
        alert("Error al eliminar el registro: " + (err.error?.message || err.message));
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
    this.previewUrl = null;
    this.mostrarModalBitacora = true;
  }

  cerrarModalBitacora() {
    this.mostrarModalBitacora = false;
    this.previewUrl = null;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scale = MAX_WIDTH / img.width;

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compresión a JPEG para reducir tamaño de la cadena Base64
        const compressed = canvas.toDataURL('image/jpeg', 0.6);

        this.previewUrl = compressed;
        this.bitacoraForm.patchValue({
          evidenciaUrl: compressed
        });
      };
    };

    reader.readAsDataURL(file);
  }

  quitarFoto() {
    this.previewUrl = null;
    this.bitacoraForm.patchValue({ evidenciaUrl: '' });
  }

  verImagen(url: string) {
    if (url) window.open(url, '_blank');
  }

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
    this.civico.generarDocumentoPDF(tipo, expId).subscribe({
      next: (blob) => this.abrirBlob(blob, nombres[tipo] || tipo),
      error: (err) => {
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
      }
    });
  }

  private abrirBlob(blob: Blob, nombre: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}_${this.expediente.beneficiario?.nombre || 'Doc'}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

