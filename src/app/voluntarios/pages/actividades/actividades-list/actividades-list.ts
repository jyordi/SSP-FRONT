import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActividadService } from '../../../services/actividad.service';
import { Paginacion } from "../../../shared/paginacion/paginacion";
import { SessionService } from '../../../../services/session';

@Component({
  selector: 'app-actividades-list',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, Paginacion],
  templateUrl: './actividades-list.html',
  styleUrl: './actividades-list.css'
})
export class ActividadesList {
  private readonly svc = inject(ActividadService);
  private readonly session = inject(SessionService);
  readonly puedeEliminar = this.session.puedeEliminarEnVoluntarios();

  searchTerm   = signal('');
  filtroEstado = signal('Todos');
 paginaActual = signal(1);
  itemsPorPagina = 5;

   actividadesFiltradas = computed(() => {
    const t = this.searchTerm().toLowerCase();
    const e = this.filtroEstado();
    return this.svc.actividades().filter(a => {
     const okSearch = !t ||
        a.nombreActividad?.toLowerCase().includes(t) ||
        a.impartidor?.toLowerCase().includes(t) ||
        a.responsable?.toLowerCase().includes(t) ||
        a.lugar?.toLowerCase().includes(t);
      const okEstado = e === 'Todos' || a.estado === e;
      return okSearch && okEstado;
    });
  });
   totalItems = computed(() => this.actividadesFiltradas().length);

 actividades = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.actividadesFiltradas().slice(inicio, fin);
  });


  eliminar(id: string): void {
    if (!this.puedeEliminar) return;
    if (confirm('¿Eliminar esta actividad?')) {
      this.svc.delete(id).subscribe({
        next: () => console.log('Actividad eliminada'),
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }
   onPaginaCambiada(pagina: number): void {
    this.paginaActual.set(pagina);
       window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
