import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SessionService } from '../../services/session';
import { ExpedientesService } from '../../services/expedientes';
import { PenalService } from '../../services/penal';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-caratura-expediente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarReconectaComponent],
  templateUrl: './caratura-expediente.html',
  styleUrl: './caratura-expediente.css'
})
export class CaraturaExpediente implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  private readonly expedientesService = inject(ExpedientesService);
  private readonly penalService = inject(PenalService);

  form!: FormGroup;
  loading = false;
  toast: { msg: string; tipo: 'ok' | 'error' } | null = null;

  // Variables de Entorno
  expedienteId: number | null = null;
  role = '';
  puedeEditar = false;
  descargandoPdf = false;

  // Datos Preexistentes (Sólo lectura)
  expedienteData: any = null;
  beneficiarioData: any = null;
  
  // Registro Existente en Backend
  caratulaExistente: any = null;

  ngOnInit(): void {
    // 1. Verificar Roles (Administrador y Trabajo Social pueden editar)
    this.role = this.session.getRole();
    if (this.esAdmin() || this.esTrabajoSocial()) {
      this.puedeEditar = true;
    }

    // 2. Extraer ID del expediente
    const paramId = this.route.snapshot.params['id'];
    const navState = this.router.getCurrentNavigation?.()?.extras?.state ?? history.state;

    if (navState?.expediente) {
      this.expedienteId = navState.expediente.id;
    } else if (paramId) {
      this.expedienteId = +paramId;
    } else {
      const raw = sessionStorage.getItem('expediente');
      if (raw) {
        try { this.expedienteId = JSON.parse(raw)?.id ?? null; } catch { }
      }
    }

    if (!this.expedienteId) {
      this.router.navigate(['/expedientes']);
      return;
    }

    this._buildForm();
    this._cargarDatosNativos();
  }

  private _buildForm(): void {
    this.form = this.fb.group({
      alias: [''],
      observaciones: ['']
    });

    if (!this.puedeEditar) {
      this.form.disable();
    }
  }

  private _cargarDatosNativos(): void {
    this.loading = true;
    
    // Obtenemos los datos base del expediente para mostrarlos
    this.expedientesService.getResumenPenal(this.expedienteId!).subscribe({
      next: (res: any) => {
        this.expedienteData = res.expediente ?? res;
        this.beneficiarioData = res.beneficiario ?? this.expedienteData.beneficiario;
        
        // Ahora consultamos si ya había una carátula guardada previamente
        this._verificarCaratula();
      },
      error: () => {
        this.loading = false;
        this.mostrarToast('Error al cargar datos base', 'error');
      }
    });
  }

  private _verificarCaratula(): void {
    this.penalService.getCaratulaByExpediente(this.expedienteId!).subscribe({
      next: (caratula) => {
        this.loading = false;
        this.caratulaExistente = caratula;
        // Si existe, inyectamos los datos al formulario
        this.form.patchValue({
          alias: caratula.alias ?? '',
          observaciones: caratula.observaciones ?? ''
        });
      },
      error: (err) => {
        this.loading = false;
        // 404 es esperado si es la primera vez
        if (err.status !== 404) {
          console.error('Error al verificar carátula', err);
        }
      }
    });
  }

  guardar(): void {
    if (!this.puedeEditar) return;
    this.loading = true;

    // Sólo enviamos lo indispensable
    const payload = {
      expedienteId: this.expedienteId,
      alias: this.form.value.alias,
      observaciones: this.form.value.observaciones
    };

    const onExito = (res: any) => {
      this.loading = false;
      this.caratulaExistente = res;
      this.mostrarToast('Carátula procesada con éxito', 'ok');
      // Redirigir casi de inmediato
      setTimeout(() => {
        this.regresar();
      }, 1000);
    };

    const onError = (err: any) => {
      this.loading = false;
      if (err.status === 409) {
        this.mostrarToast(err.error?.message || 'Conflicto de módulos previos', 'error');
      } else {
        this.mostrarToast('Error al guardar carátula', 'error');
      }
    };

    if (this.caratulaExistente && this.caratulaExistente.id) {
      this.penalService.updateCaratula(this.caratulaExistente.id, payload).subscribe({
        next: onExito,
        error: onError
      });
    } else {
      this.penalService.saveCaratula(payload).subscribe({
        next: onExito,
        error: onError
      });
    }
  }

  descargarPdf(): void {
    if (!this.expedienteId) return;
    this.descargandoPdf = true;

    this.penalService.getCaratulaPdf(this.expedienteId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CARATULA_EXPEDIENTE_${this.expedienteId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.descargandoPdf = false;
        this.mostrarToast('✅ PDF generado con éxito', 'ok');
      },
      error: (err) => {
        console.error('Error bpdf:', err);
        this.descargandoPdf = false;
        this.mostrarToast('Error al generar PDF', 'error');
      }
    });
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

  // ─── ROLES ────────────────────────────────────────────────
  esAdmin()         { return this.role === 'admin'; }
  esPsicologo()     { return this.role === 'psicologo'; }
  esTrabajoSocial() { return this.role === 'trabajo_social'; }
  esGuia()          { return this.role === 'guia'; }

  // Funciones Utilitarias de Presentación
  get nombreBeneficiario(): string {
    if(this.caratulaExistente && this.caratulaExistente.nombre) return this.caratulaExistente.nombre;
    if (!this.beneficiarioData) return 'Sin asignar';
    return (this.beneficiarioData.nombreCompleto || 
            `${this.beneficiarioData.nombre || ''} ${this.beneficiarioData.apellidoPaterno || ''} ${this.beneficiarioData.apellidoMaterno || ''}`).trim();
  }

  get cPenal(): string { return this.expedienteData?.cPenal || '—'; }
  get folio(): string { return this.expedienteData?.folioExpediente || this.expedienteData?.noExpediente || '—'; }
  get juzgado(): string { return this.caratulaExistente?.juzgado || this.expedienteData?.juzgado || '—'; }
  get delito(): string { return this.caratulaExistente?.delito || this.expedienteData?.delito || '—'; }
  get agraviado(): string { return this.caratulaExistente?.agraviado || this.expedienteData?.agraviado || '—'; }
  get medidaCautelar(): string { return this.caratulaExistente?.medidaCautelar || this.expedienteData?.medidaCautelar || '—'; }
}