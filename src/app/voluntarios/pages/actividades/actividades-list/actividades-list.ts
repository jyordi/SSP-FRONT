import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActividadService } from '../../../services/actividad.service';

@Component({
  selector: 'app-actividades-list',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './actividades-list.html',
  styleUrl: './actividades-list.css'
})
export class ActividadesList {
  private svc = inject(ActividadService);

  searchTerm   = signal('');
  filtroEstado = signal('Todos');

  actividades = computed(() => {
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

  eliminar(id: string): void {
    if (confirm('¿Eliminar esta actividad?')) {
      this.svc.delete(id).subscribe({
        next: () => console.log('Actividad eliminada'),
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }
}
