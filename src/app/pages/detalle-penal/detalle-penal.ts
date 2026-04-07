import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { SessionService } from '../../services/session';
import { PenalService } from '../../services/penal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './detalle-penal.html',
  styleUrls: ['./detalle-penal.css']
})
export class DetallePenalComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';
  planes: any[] = [];

  previewUrl: string | ArrayBuffer | null = null;
  selectedFile!: File;

  // 🔥 VALORACIÓN
  valoracion: any = null;
  loadingValoracion = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private penalService: PenalService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];

    this.service.getResumenPenal(id).subscribe({
      next: (res: any) => {
        this.expediente = res.expediente;
        this.loading = false;

        if (this.esAdmin() || this.esPsicologo()) {
  this.getValoracion();
}
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar expediente');
      }
    });


    this.penalService.getPlanTrabajoByExpediente(id).subscribe({
  next: (res: any) => {
    this.planes = Array.isArray(res) ? res : [res];
    console.log('📋 PLANES:', this.planes);
  },
  error: () => {
    this.planes = [];
  }
});
    
  }

  // 🔥 TRAER VALORACIÓN
  getValoracion() {
    this.penalService.getValoracionByExpediente(this.expediente.id)
      .subscribe({
        next: (res: any) => {
          this.valoracion = res;
          this.loadingValoracion = false;
        },
        error: () => {
          this.valoracion = null;
          this.loadingValoracion = false;
        }
      });
  }

  // 🔥 FOTO
  onFileSelected(event: any) {
    if (!this.esAdmin()) return;

    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // 🔥 GUARDAR
  guardarCambios() {
    this.guardando = true;

    this.service.updatePenal(this.expediente.id, this.expediente)
      .subscribe({
        next: () => {
          this.guardando = false;
          alert('Actualizado correctamente');
        },
        error: () => {
          this.guardando = false;
          alert('Error al actualizar');
        }
      });
  }

  // 🔥 NAVEGACIÓN
  irModulo(ruta: string) {
    sessionStorage.setItem('expediente', JSON.stringify(this.expediente));

    this.router.navigate([ruta], {
      state: { expediente: this.expediente }
    });
  }

  // 🔐 ROLES
  esAdmin() { return this.role === 'admin'; }
  esPsicologo() { return this.role === 'psicologo'; }
  esTrabajoSocial() { return this.role === 'trabajo_social'; }
  esGuia() { return this.role === 'guia'; }

  // 🔙 VOLVER
  volver() {
    this.router.navigate(['/expedientes']);
  }

  
irDetalleAdmin(): void {

  const plan = this.planes[0];

  if (!plan) {
    alert('No hay plan disponible');
    return;
  }

  this.router.navigate(['/plan-detalle-admin', plan.id], {
    state: {
      expediente: this.expediente,
      beneficiario: this.expediente?.beneficiario
    }
  });
}
  
}