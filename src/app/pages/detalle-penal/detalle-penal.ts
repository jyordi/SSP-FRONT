import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { SessionService } from '../../services/session';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-penal.html',
  styleUrls: ['./detalle-penal.css']
})
export class DetallePenalComponent implements OnInit {

  expediente: any;
  loading = true;
  guardando = false;
  role = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();

    const id = this.route.snapshot.params['id'];

    this.service.getResumenPenal(id).subscribe({
      next: (res: any) => {
        this.expediente = res.expediente;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar expediente');
      }
    });
  }

  // 🔥 ACTUALIZAR
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

  // 🔥 NAVEGACIÓN CORREGIDA (SIN ID)
  irModulo(ruta: string) {

  // 🔥 GUARDAR EN SESSION (ANTI F5)
  sessionStorage.setItem('expediente', JSON.stringify(this.expediente));

  this.router.navigate([ruta], {
    state: { expediente: this.expediente }
  });
}

  // 🔥 ROLES
  esAdmin() {
    return this.role === 'admin';
  }

  esPsicologo() {
    return this.role === 'psicologo';
  }

  esTrabajoSocial() {
    return this.role === 'trabajo_social';
  }

  esGuia() {
    return this.role === 'guia';
  }

  // 🔙 VOLVER
  volver() {
    this.router.navigate(['/expedientes']);
  }
}