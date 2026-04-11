import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { PenalService } from '../../services/penal';
import { UsersService } from '../../services/users.service';
import { NavbarReconectaComponent } from '../../shared/navbar-reconecta/navbar-reconecta';

@Component({
  selector: 'app-plan-trabajo-individualizado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './plan-trabajo-individualizado.component.html',
  styleUrls: ['./plan-trabajo-individualizado.component.css']
})
export class PlanTrabajoIndividualizadoComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  private readonly penalService = inject(PenalService);
  private readonly usersService = inject(UsersService);

  form!: FormGroup;
  loading = false;
  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;
  
  // Variables del entorno
  expedienteId: number | null = null;
  role = '';
  userId: number | null = null;
  
  // Lista de Guías para el select
  guiasDisponibles: any[] = [];
  
  // Estado de Lectura o Creación
  planExistente: any = null;
  puedeEditar = false;
  modoEdicion = false;
  descargandoPdf = false;

  async descargarPdf() {
    if (!this.planExistente?.id) return;
    this.descargandoPdf = true;
    
    this.penalService.getPlanTrabajoPdf(this.planExistente.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PLAN_TRABAJO_${this.planExistente.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.descargandoPdf = false;
        this.mostrarToast('✅ PDF descargado con éxito', 'ok');
      },
      error: (err) => {
        console.error('Error bpdf:', err);
        this.descargandoPdf = false;
        this.mostrarToast('Error al generar el PDF', 'error');
      }
    });
  }

  ngOnInit(): void {
    this.role = this.session.getRole();
    this.userId = this.session.getUserId ? this.session.getUserId() : this._parseUserIdFromToken();

    // Permisos: Admin y Guía pueden crear/editar
    if (this.role === 'admin' || this.role === 'guia') {
      this.puedeEditar = true;
    }

    // Identificar el ID del expediente por parámetro o state
    const paramId = this.route.snapshot.params['id'];
    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;

    if (navState?.expediente) {
      this.expedienteId = navState.expediente.id;
    } else if (paramId) {
      this.expedienteId = +paramId;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          this.expedienteId = parsed.id;
        } catch { }
      }
    }

    if (!this.expedienteId) {
      this.router.navigate(['/expedientes']);
      return;
    }

    this._buildForm();
    this._cargarGuias();
    this._verificarPlanExistente();
  }

  private _buildForm(): void {
    // Definimos STRICTAMENTE lo que pide el JSON y nada más
    this.form = this.fb.group({
      expedienteId: [this.expedienteId, Validators.required],
      guiaId: [this.role === 'guia' ? this.userId : null, Validators.required],
      periodo: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      
      datosJsonb: this.fb.group({
        // Campos requeridos por el PDF "DATOS DEL PLAN DE TRABAJO"
        descripcion: [''],
        objetivos: [''],
        estrategias: [''],
        observaciones: [''],

        // Ejes transversales (internos)
        proceso_ingreso: this.fb.group({
          situacion_actual: ['']
        }),
        proceso_seguimiento: this.fb.group({
          educativa: [''],
          laboral: [''],
          familiar: ['']
        }),
        proyecto_vida: this.fb.group({
          personal: [''],
          social: ['']
        })
      })
    });
  }

  private _cargarGuias(): void {
    this.usersService.obtenerUsuarios().subscribe({
      next: (res: any[]) => {
        // Filtrar exclusivamente los usuarios con rol 'guia'
        this.guiasDisponibles = res.filter(u => u.rol === 'guia');
      },
      error: () => console.error('No se pudieron cargar los guías')
    });
  }

  private _verificarPlanExistente(): void {
    if (!this.expedienteId) return;
    this.loading = true;

    this.penalService.getPlanTrabajoByExpediente(this.expedienteId).subscribe({
      next: (res: any) => {
        this.loading = false;
        const planes = Array.isArray(res) ? res : [res];
        
        if (planes.length > 0) {
          this.planExistente = planes[0];
          this._rellenarFormulario();
          this.form.disable();
        }
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  private _rellenarFormulario(): void {
    if (!this.planExistente) return;
    this.form.patchValue({
      guiaId: this.planExistente.guia?.id || this.planExistente.guia,
      periodo: this.planExistente.periodo || '',
      fechaInicio: this.planExistente.fechaInicio ? this.planExistente.fechaInicio.substring(0, 10) : '',
      fechaFin: this.planExistente.fechaFin ? this.planExistente.fechaFin.substring(0, 10) : '',
      datosJsonb: this.planExistente.datosJsonb || {}
    });
  }

  activarEdicion(): void {
    this.modoEdicion = true;
    this.form.enable();
    // El expedienteId y guiaId no deberían cambiarse una vez creado el plan
    this.form.get('expedienteId')?.disable();
    this.form.get('guiaId')?.disable();
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
    this._rellenarFormulario();
    this.form.disable();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarToast('Faltan campos obligatorios', 'error');
      return;
    }

    this.loading = true;
    const baseDto = this.form.getRawValue(); // getRawValue para incluir expedienteId deshabilitado

    const dto = {
      ...baseDto,
      guiaId: Number(baseDto.guiaId)
    };

    const request$ = this.planExistente?.id
      ? this.penalService.updatePlanTrabajo(this.planExistente.id, dto)
      : this.penalService.savePlanTrabajo(dto);

    request$.subscribe({
      next: (res) => {
        this.loading = false;
        this.mostrarToast(this.planExistente?.id ? '✅ Plan actualizado' : '✅ Plan guardado correctamente', 'ok');
        this.planExistente = res;
        this.modoEdicion = false;
        this.form.disable();
        
        if (!this.planExistente?.id) {
          setTimeout(() => this.irAPlanDetalle(), 1500);
        }
      },
      error: (err) => {
        this.loading = false;
        this.mostrarToast(err.error?.message || 'Hubo un error al procesar', 'error');
      }
    });
  }

  irAPlanDetalle(): void {
    if (this.planExistente && this.planExistente.id) {
      this.router.navigate(['/plan-detalle-admin', this.planExistente.id]);
    }
  }

  regresar(): void {
    if (this.expedienteId) {
      this.router.navigate(['/detalle-penal', this.expedienteId]);
    } else {
      this.router.navigate(['/expedientes']);
    }
  }

  mostrarToast(msg: string, tipo: 'ok' | 'error') {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3500);
  }

  private _parseUserIdFromToken(): number | null {
    try {
      const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || '';
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.id || null;
    } catch {
      return null;
    }
  }
}