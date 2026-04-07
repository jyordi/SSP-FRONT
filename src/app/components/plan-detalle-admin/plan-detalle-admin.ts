import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PenalService } from '../../services/penal';
import { SessionService } from '../../services/session';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-plan-detalle-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './plan-detalle-admin.html',
  styleUrls: ['./plan-detalle-admin.css']
})
export class PlanDetalleAdminComponent implements OnInit {

  planId!: number;
  expediente: any;
  beneficiario: any;
  planInfo: any = null;

  readonly detallePlan = signal<any[]>([]); 
  readonly actividades = signal<any[]>([]); 
  
  readonly modalCatalogo = signal(false);
  readonly modalAsignar = signal(false);
  readonly search = signal(''); 
  
  actividadesFiltradas = computed(() => {
    const term = this.search().toLowerCase();
    return this.actividades().filter(a => a.nombre.toLowerCase().includes(term));
  });

  // Lee el ID desde el objeto de actividad que devuelve el backend
  readonly actividadesAsignadasIds = computed(() => {
    return this.detallePlan().map((d: any) => d.actividad ? Number(d.actividad.id) : null);
  });

  detalleForm!: FormGroup;
  actividadForm!: FormGroup;
  
  editandoActividadId: number | null = null;
  editandoDetalleId: number | null = null;

  categorias = [
    'TRABAJO_COMUNITARIO', 'LIDERAZGO_COMUNITARIO', 
    'ATENCION_SUSTANCIAS', 'EDUCACION_PARA_LA_VIDA', 'PROMOCION_CULTURAL_DEPORTIVA'
  ];

  estatusList = ['PENDIENTE', 'EN_PROCESO', 'CUMPLIDA'];

  constructor(
    private fb: FormBuilder,
    private penalService: PenalService,
    private route: ActivatedRoute,
    private router: Router,
    public session: SessionService
  ) {}

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    const nav = this.router.getCurrentNavigation();
    this.expediente = nav?.extras?.state?.['expediente'] || history.state?.expediente;
    this.beneficiario = nav?.extras?.state?.['beneficiario'] || history.state?.beneficiario;

    this._buildForms();
    this._cargarActividades();
    this._cargarDetalle();
    this._cargarPlanInfo();
  }

  private _buildForms(): void {
    this.detalleForm = this.fb.group({
      actividadId: [null, Validators.required],
      estatus: ['PENDIENTE', Validators.required],
      objetivo: [''],
      cumplimiento: [''],
      observaciones: [''],
      fechaAsignacion: [new Date().toISOString().split('T')[0]]
    });

    this.actividadForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      objetivo: [''],
      categoria: ['TRABAJO_COMUNITARIO', Validators.required]
    });
  }

  private _cargarPlanInfo(): void {
    this.penalService.getPlanTrabajoById(this.planId).subscribe(res => this.planInfo = res);
  }

  private _cargarDetalle(): void {
    this.penalService.getPlanDetalle(this.planId).subscribe((res: any) => {
      this.detallePlan.set(Array.isArray(res) ? res : [res]);
    });
  }

  private _cargarActividades(): void {
    this.penalService.getActividades().subscribe((res: any) => {
      this.actividades.set(Array.isArray(res) ? res : [res]);
    });
  }

  // ─── GESTIÓN DE DETALLE DEL PLAN ────────────────────────────
  abrirModalAsignar(detalle?: any): void {
    if (detalle) {
      this.editandoDetalleId = detalle.id;
      this.detalleForm.patchValue({
        actividadId: detalle.actividad ? Number(detalle.actividad.id) : null,
        estatus: detalle.estatus,
        objetivo: detalle.objetivo,
        cumplimiento: detalle.cumplimiento,
        observaciones: detalle.observaciones,
        fechaAsignacion: detalle.fechaAsignacion ? detalle.fechaAsignacion.split('T')[0] : ''
      });
      this.detalleForm.get('actividadId')?.disable(); // Bloqueamos cambio de actividad
    } else {
      this.editandoDetalleId = null;
      this.detalleForm.reset({ 
        actividadId: null, 
        estatus: 'PENDIENTE', 
        fechaAsignacion: new Date().toISOString().split('T')[0] 
      });
      this.detalleForm.get('actividadId')?.enable(); 
    }
    this.modalAsignar.set(true);
  }

  guardarDetalle(): void {
    if (this.detalleForm.invalid) return;

    const formValues = this.detalleForm.getRawValue(); 

    // 👇 ESTE PAYLOAD ES EXACTAMENTE LO QUE PIDE TU CreatePlanTrabajoDetalleDto
    const payload = {
      planTrabajoId: Number(this.planId),
      actividadId: Number(formValues.actividadId),
      estatus: formValues.estatus,
      objetivo: formValues.objetivo,
      cumplimiento: formValues.cumplimiento,
      observaciones: formValues.observaciones,
      fechaAsignacion: formValues.fechaAsignacion
    };

    if (this.editandoDetalleId) {
      // Al actualizar, mandamos el mismo payload, tu backend (UpdatePlanTrabajoDetalleDto)
      // tomará solo los campos que permite (estatus, objetivos, etc).
      this.penalService.updatePlanDetalle(this.editandoDetalleId, payload).subscribe({
        next: () => {
          this._cargarDetalle();
          this.modalAsignar.set(false);
        },
        error: (err) => alert('Error al actualizar el seguimiento.')
      });
    } else {
      this.penalService.savePlanDetalle(payload).subscribe({
        next: () => {
          this._cargarDetalle();
          this.modalAsignar.set(false);
        },
        error: (err) => {
          if(err.status === 409) alert('⚠️ Esta actividad ya está asignada al plan.');
          else alert('Error al guardar la actividad. Revisa los datos.');
        }
      });
    }
  }

  eliminarDetalle(id: number): void {
    if (confirm('¿Seguro que deseas eliminar esta asignación del plan?')) {
      this.penalService.deletePlanDetalle(id).subscribe({
        next: () => this._cargarDetalle(),
        error: () => alert('Error al eliminar.')
      });
    }
  }

  // ─── GESTIÓN DEL CATÁLOGO ────────────────────────────
  abrirModalCatalogo(): void {
    this.editandoActividadId = null;
    this.actividadForm.reset({ categoria: 'TRABAJO_COMUNITARIO' });
    this.modalCatalogo.set(true);
  }

  guardarActividad(): void {
    if (this.actividadForm.invalid) return;
    if (this.editandoActividadId) {
      this.penalService.updateActividad(this.editandoActividadId, this.actividadForm.value).subscribe(() => {
        this._cargarActividades();
        this.editandoActividadId = null;
        this.actividadForm.reset({ categoria: 'TRABAJO_COMUNITARIO' });
      });
    } else {
      this.penalService.crearActividad(this.actividadForm.value).subscribe(() => {
        this._cargarActividades();
        this.actividadForm.reset({ categoria: 'TRABAJO_COMUNITARIO' });
      });
    }
  }

  editarActividad(actividad: any): void {
    this.editandoActividadId = actividad.id;
    this.actividadForm.patchValue(actividad);
  }

  eliminarActividad(id: number): void {
    // Si tu backend lo que hace es desactivar, usamos el mismo método
    if (confirm('¿Eliminar actividad del catálogo?')) {
      this.penalService.deleteActividad(id).subscribe(() => this._cargarActividades());
    }
  }
}