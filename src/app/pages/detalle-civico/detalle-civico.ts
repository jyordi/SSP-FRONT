import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { FormsModule } from '@angular/forms';
import { Civico } from '../../services/civico';
import { HttpClient } from '@angular/common/http';
import { SessionDetalleC } from '../../civil/session-detalle-c/session-detalle-c';
import { PsicoTabs } from "../../civil/psico-tabs/psico-tabs";
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PsicoTabs],
  templateUrl: './detalle-civico.html',
  styleUrls: ['./detalle-civico.css']  
})
export class DetalleCivicoComponent implements OnInit {
notaSeleccionada: any = null;


  tabActual: string = 'psicologia';
  expediente: any;
  loading = true;
  guardando = false;
  role = '';

  //  NUEVO
  notas: any[] = [];
  

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private civico: Civico
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];

    this.civico.getResumenCivico(id).subscribe({
      next: (res: any) => {
        this.expediente = res;
        this.loading = false;

        this.cargarNotas(); //  CLAVE
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar expediente');
      }
    });

    if (this.esPsicologo()) {
      this.tabActual = 'psicologia';
    }
  }

  cambiarTab(tab: string) {
    this.tabActual = tab;
  }

  //  LISTAR SESIONES
  cargarNotas() {
    const id = this.expediente?.idUUID;
    if (!id) return;

    this.civico.listarSesiones(id).subscribe({
      next: (res) => {
        console.log(" NOTAS:", res);
        this.notas = res;
      },
      error: (err) => console.error(err)
    });
  }

  

  guardarCambios() {
    this.guardando = true;

    this.civico.updateCivico(this.expediente.id, this.expediente)
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

  volver() {
    this.router.navigate(['/expedientes']);
  }

  esAdmin() { return this.role === 'admin'; }
  esPsicologo() { return this.role === 'psicologo'; }

  //  NAVEGACIÓN
  irPsico(tipo: string) {

    if (tipo === 'formu-psico') {
      this.router.navigate(['/formu-psico']);

    } else if (tipo === 'segui-psi') {

      const id = this.expediente?.idUUID;

      if (!id) {
        alert("Error: expediente sin ID");
        return;
      }

      this.router.navigate(['/segui-psi', id]);
    }
  }
}