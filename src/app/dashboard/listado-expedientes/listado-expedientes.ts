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
  ) { }

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
      civico: this.expedientesService.getCivico(),
      beneficiarios: this.expedientesService.getBeneficiarios()
    }).subscribe({
      next: ({ penal, civico, beneficiarios }) => {
        // Mapa de beneficiarios para acceso rápido
        const bMap = new Map();
        (beneficiarios || []).forEach((b: any) => bMap.set(b.id, b));
        const listPenal = (penal || []).map((e: any) => ({
          id: e.id || e.idUUID,
          nombre: e.beneficiario?.nombre || 'Sin nombre',
          tipo: 'Penal',
          folio: e.folioExpediente || e.folio || '—',
          delito: e.delito || 'Sin especificar',
          estatus: e.estatus || 'REGISTRADO',
          createdAt: e.creadoEn || e.createdAt,
          urlFoto: e.beneficiario?.urlFoto || null,
          original: e
        }));

        const listCivico = (civico || []).map((e: any) => {
          // Buscamos el beneficiario en el mapa si no viene poblado
          const b = e.beneficiario || bMap.get(e.beneficiarioId);
          
          return {
            id: e.id || e.idUUID,
            nombre: b?.nombre || e.nombre || 'Sin nombre',
            tipo: 'Cívico',
            folio: e.folioExpediente || e.folio || '—',
            delito: e.delito || e.falta || 'Sin especificar',
            estatus: e.estatus || 'REGISTRADO',
            createdAt: e.creadoEn || e.createdAt,
            // Nuevos campos informativos
            curp: e.curp || b?.curp || '—',
            municipio: e.municipio || b?.municipio || '—',
            horasSentencia: e.horasSentencia || 0,
            juzgado: e.numJuzgadoCivico || '—',
            urlFoto: b?.urlFoto || e.urlFoto || null,
            original: e
          };
        });

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

      // Búsqueda expandida (Nombre, Folio, Delito, CURP, Municipio)
      const term = this.searchTerm?.toLowerCase();
      const matchSearch = !term
        || e.nombre.toLowerCase().includes(term)
        || e.folio.toLowerCase().includes(term)
        || e.delito.toLowerCase().includes(term)
        || (e.curp && e.curp.toLowerCase().includes(term))
        || (e.municipio && e.municipio.toLowerCase().includes(term));

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
    if (!expediente || !expediente.id) {
      console.error('ID inválido:', expediente);
      alert('Error: Este expediente no tiene un identificador válido.');
      return;
    }

    if (expediente.tipo === 'Penal') {
      this.router.navigate(['/detalle-penal', expediente.id]);
    } else if (expediente.tipo === 'Cívico') {
      this.router.navigate(['/detalle-civico', expediente.id]);
    } else {
      console.error('Tipo desconocido:', expediente.tipo);
      alert('Error: Tipo de expediente no reconocido.');
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
    return this.role === 'admin' || this.role === 'trabajo_social';
  }

  puedeGestionarUsuarios(): boolean {
    return this.role === 'admin';
  }

  puedeAccederVoluntarios(): boolean {
    return this.sessionService.puedeAccederVoluntarios();
  }
}
