import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';


@Component({
  selector: 'app-listado-expedientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listado-expedientes.html',
  styleUrls: ['./listado-expedientes.css'],
})
export class ListadoExpedientesComponent {
  // Variables de control
  user = { name: 'Psic. Avelina Escárcega' };
  searchTerm: string = '';
  filtroActual: string = 'Todos';
  menuFiltroAbierto: boolean = false;

  // Datos de prueba directos (Para que no falle la carga)
  expedientes = [
    { id: 1, tipo: 'Penal', folio: 'RCP-PEN-001', nombre: 'Juan Pérez López', delito: 'Daño a las cosas', avance: 45, estatus: 'En Proceso' },
    { id: 2, tipo: 'Cívico', folio: 'RCP-CIV-002', nombre: 'María González Ruiz', delito: 'Falta administrativa', avance: 80, estatus: 'Favorable' },
    { id: 3, tipo: 'Penal', folio: 'BORRADOR-03', nombre: 'Carlos Ruiz Sánchez', delito: 'Robo simple', avance: 0, estatus: 'Incompleto', faseActual: 'Valoración Psicológica' },
    { id: 4, tipo: 'Voluntario', folio: 'RCP-VOL-004', nombre: 'Ana Victoria Méndez', delito: 'Asistencia Social', avance: 100, estatus: 'Completado' },
    { id: 5, tipo: 'Penal', folio: 'RCP-PEN-005', nombre: 'Roberto Gómez', delito: 'Lesiones leves', avance: 20, estatus: 'En Proceso' },
    { id: 6, tipo: 'Cívico', folio: 'RCP-CIV-006', nombre: 'Lucía Fernández', delito: 'Obstrucción vía pública', avance: 60, estatus: 'En Proceso' }
  ];

  constructor(private router: Router) {
    // COMENTA ESTO SI EXISTE: No redirigir al login en el constructor mientras pruebas
    // if (!sessionStorage.getItem('token')) { this.router.navigate(['/login']); }
  }

  toggleFiltro() { 
    this.menuFiltroAbierto = !this.menuFiltroAbierto; 
  }

  seleccionarFiltro(f: string) { 
    this.filtroActual = f; 
    this.menuFiltroAbierto = false; 
  }

  // Cierra el menú al hacer clic fuera
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

  // Navegación
  nuevoIngreso() {
    console.log('Navegando a nuevo ingreso...');
    // this.router.navigate(['/registro']);
  }

  continuarSeguimiento(id: number) {
    console.log('Abriendo expediente:', id);
  }

  cerrarSesion() {
    this.router.navigate(['/login']);
  }
}