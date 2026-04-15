import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonaService } from '../../../services/persona.service';
import { CsvModal } from '../../../shared/csv-modal/csv-modal';
import { Paginacion } from "../../../shared/paginacion/paginacion";
import { SessionService } from '../../../../services/session';

@Component({
  selector: 'app-personas-list',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, CsvModal, Paginacion],
  templateUrl: './personas-list.html',
  styleUrl: './personas-list.css'
})
export class PersonasList {
  private readonly svc = inject(PersonaService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  readonly puedeEliminar = this.session.puedeEliminarEnVoluntarios();
  mostrarModalCsv = signal(false);

  searchTerm   = signal('');
  filtroEstado = signal('Todos');
 paginaActual = signal(1);
  itemsPorPagina = 5;

    personasFiltradas = computed(() => {
    const t = this.searchTerm().toLowerCase();
    const e = this.filtroEstado();
    return this.svc.personas().filter(p => {
      const okSearch = !t ||
        p.nombre?.toLowerCase().includes(t) ||
        p.sobrenombre?.toLowerCase().includes(t) ||
        p.curp?.toLowerCase().includes(t) ||
        p.motivoIngreso?.toLowerCase().includes(t);
      const okEstado = e === 'Todos' || p.estado === e;
      return okSearch && okEstado;
    });
  });

  totalItems = computed(() => this.personasFiltradas().length);

 personas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.personasFiltradas().slice(inicio, fin);
  });



  verPersona(id: string): void {
    this.router.navigate(['/voluntarios/personas/editar', id]);
  }

  eliminar(id: string, event: Event): void {
    event.stopPropagation();
    if (!this.puedeEliminar) return;
    if (confirm('¿Eliminar esta persona?')) {
      this.svc.delete(id).subscribe({
        next: () => console.log('Persona eliminada'),
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }
    abrirModalCsv(): void {
    this.mostrarModalCsv.set(true);
  }

  cerrarModalCsv(): void {
    this.mostrarModalCsv.set(false);
  }

  onCsvCargado(): void {
    this.svc.refresh(); // Refresca la lista
    setTimeout(() => this.cerrarModalCsv(), 2000); // Cierra después de 2 segundos
  }
  onPaginaCambiada(pagina: number): void {
    this.paginaActual.set(pagina);
       window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
