import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { ExpedientesService } from '../../services/expedientes';


@Component({
  selector: 'app-listado-expedientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listado-expedientes.html',
  styleUrls: ['./listado-expedientes.css'],
})
export class ListadoExpedientesComponent implements OnInit {

  user: any = { name: '' };
  role: string = '';

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
  }

 cerrarSesion() {
  this.sessionService.clearSession();
  this.router.navigate(['/login']);
}

  // TODO lo demás igual 👇
  searchTerm: string = '';
  filtroActual: string = 'Todos';
  menuFiltroAbierto: boolean = false;

  expedientes: any[] = [];

  toggleFiltro() { 
    this.menuFiltroAbierto = !this.menuFiltroAbierto; 
  }

  seleccionarFiltro(f: string) { 
    this.filtroActual = f; 
    this.menuFiltroAbierto = false; 
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!event.target.closest('.filter-container')) { 
      this.menuFiltroAbierto = false; 
    }
  }

  get expedientesFiltrados() {
    let res = [...this.expedientes];
    if (this.filtroActual !== 'Todos') {
      res = this.filtroActual === 'Incompletos' 
        ? res.filter(e => e.estatus === 'Incompleto') 
        : res.filter(e => e.tipo === this.filtroActual);
    }
    if (this.searchTerm) {
      res = res.filter(e => e.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return res;
  }

  nuevoIngreso() {
     this.router.navigate(['/seleccion']);
  }

  nuevoUsuario() {
    this.router.navigate(['/nuevo-usuario']);
  }

  

  cargarPenal() {
    this.expedientesService.getPenal().subscribe({
      next: (res) => {
        this.expedientes = res.map((e: any) => ({
          id: e.id,
          nombre: e.beneficiario?.nombre || 'Sin nombre',
          tipo: 'Penal',
          folio: e.folio || 'N/A',
          delito: e.delito || 'Sin especificar',
          estatus: e.estatus || 'Pendiente',
          avance: e.avance || 0,
          faseActual: e.faseActual || 'N/A',
          original: e
        }));
      },
      error: (err) => console.error(err)
    });
  }

  cargarCivico() {
    this.expedientesService.getCivico().subscribe({
      next: (res) => {
        this.expedientes = res.map((e: any) => ({
          id: e.id|| e.idUUID,
          nombre: e.nombre || e.beneficiario?.nombre || 'Sin nombre',
          tipo: 'Civico',
          folio: e.folio || 'N/A',
          delito: e.delito || 'Sin especificar',
          estatus: e.estatus || 'Pendiente',
          avance: e.avance || 0,
          faseActual: e.faseActual || 'N/A',
          original: e
        }));
      },
      error: (err) => console.error(err)
    });
  }

  cargarVoluntario() {
    this.router.navigate(['/voluntarios/personas']);
  }

  continuarSeguimiento(expediente: any) {
    if (expediente.tipo === 'Penal') {
      this.router.navigate(['/detalle-penal', expediente.id]);
    }

    if (expediente.tipo === 'Civico') {
      this.router.navigate(['/detalle-civico', expediente.id]);
    }

    if (!expediente.id) {
    console.error('ID inválido:', expediente);
    alert('Este expediente no tiene ID válido');
    return;
  }

  
  }
}

