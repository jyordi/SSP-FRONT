import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SessionService } from '../../services/session';
import { ExpedientesService } from '../../services/expedientes';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-listado-expedientes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarReconectaComponent],
  templateUrl: './listado-expedientes.html',
  styleUrls: ['./listado-expedientes.css'],
})
export class ListadoExpedientesComponent implements OnInit {

  user: any = { name: '' };
  role: string = '';

  searchTerm: string = '';
  filtroTipo: 'Todos' | 'Penal' | 'Cívico' = 'Todos';
  filtroEstatus: 'Todos' | 'Pendientes' | 'Completos' = 'Todos';

  expedientes: any[] = [];
  loading: boolean = true;

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private expedientesService: ExpedientesService
  ) {}

  ngOnInit(): void {
    this.role = this.sessionService.getRole();
    this.user.name = this.sessionService.getUserName();

    setInterval(() => {
      if (this.sessionService.isTokenExpired()) {
        this.cerrarSesion();
      }
    }, 5000);

    this.cargarDatos();
  }

  cerrarSesion() {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }

  cargarDatos() {
    this.loading = true;
    forkJoin({
      penal: this.expedientesService.getPenal(),
      civico: this.expedientesService.getCivico()
    }).subscribe({
      next: ({ penal, civico }) => {
        const listPenal = (penal || []).map((e: any) => ({
          id: e.id,
          nombre: e.beneficiario?.nombre || 'Sin nombre',
          tipo: 'Penal',
          folio: e.folioExpediente || e.folio || '—',
          delito: e.delito || 'Sin especificar',
          estatus: e.estatus || 'REGISTRADO',
          createdAt: e.creadoEn || e.createdAt,
          original: e
        }));

        const listCivico = (civico || []).map((e: any) => ({
          id: e.id,
          nombre: e.beneficiario?.nombre || e.nombre || 'Sin nombre',
          tipo: 'Cívico',
          folio: e.folioExpediente || e.folio || '—',
          delito: e.delito || e.falta || 'Sin especificar',
          estatus: e.estatus || 'REGISTRADO',
          createdAt: e.creadoEn || e.createdAt,
          original: e
        }));

        // Ordenamos los más recientes primero
        this.expedientes = [...listPenal, ...listCivico].sort((a, b) => {
          const dA = new Date(a.createdAt || 0).getTime();
          const dB = new Date(b.createdAt || 0).getTime();
          return dB - dA;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  get expedientesFiltrados() {
    return this.expedientes.filter(e => {
      // Filtro tipo
      const matchTipo = this.filtroTipo === 'Todos' || e.tipo === this.filtroTipo;

      // Filtro estatus (simplificado)
      let matchEstatus = true;
      if (this.filtroEstatus === 'Pendientes') {
        matchEstatus = this.esIncompleto(e);
      } else if (this.filtroEstatus === 'Completos') {
        matchEstatus = !this.esIncompleto(e);
      }

      // Búsqueda
      const matchSearch = !this.searchTerm 
        || e.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
        || e.folio.toLowerCase().includes(this.searchTerm.toLowerCase())
        || e.delito.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchTipo && matchSearch && matchEstatus;
    });
  }

  setFiltro(tipo: 'Todos' | 'Penal' | 'Cívico') {
    this.filtroTipo = tipo;
  }

  setFiltroEstatus(est: 'Todos' | 'Pendientes' | 'Completos') {
    this.filtroEstatus = est;
  }

  nuevoIngreso() {
    this.router.navigate(['/seleccion']);
  }

  nuevoUsuario() {
    this.router.navigate(['/nuevo-usuario']);
  }

  irVoluntarios() {
    this.router.navigate(['/voluntarios/personas']);
  }

  continuarSeguimiento(expediente: any) {
    if (expediente.tipo === 'Penal') {
      this.router.navigate(['/detalle-penal', expediente.id]);
    } else if (expediente.tipo === 'Cívico') {
      this.router.navigate(['/detalle-civico', expediente.id]);
    }
  }

  formatEstatus(s: string): string {
    return (s || '').replace(/_/g, ' ');
  }

  // Lógica para determinar si falta algo en la card de forma visual
  esIncompleto(exp: any): boolean {
    return exp.estatus === 'REGISTRADO' || exp.estatus === 'Incompleto';
  }

  // Determina qué falta según el flujo secuencial
  getFaltaAlgo(exp: any): string {
    if (exp.tipo === 'Cívico') return 'Falta completar proceso cívico';
    
    switch (exp.estatus) {
      case 'REGISTRADO': return 'Falta F1 (Psicología)';
      case 'F1_COMPLETO': return 'Falta F2 (Trabajo Social)';
      case 'F2_COMPLETO': return 'Falta F3 (Plan)';
      case 'PLAN_COMPLETO': return 'Falta habilitar Carátula';
      default: return '';
    }
  }

  // Funciones de permisos por rol
  puedeCrear(): boolean {
    // Solo administrador y quizas trabajo social pueden crear nuevos ingresos
    return this.role === 'admin' || this.role === 'trabajo_social';
  }

  puedeGestionarUsuarios(): boolean {
    return this.role === 'admin';
  }
}
