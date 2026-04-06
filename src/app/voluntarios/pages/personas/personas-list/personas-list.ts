import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonaService } from '../../../services/persona.service';

@Component({
  selector: 'app-personas-list',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './personas-list.html',
  styleUrl: './personas-list.css'
})
export class PersonasList {
  private svc = inject(PersonaService);
  private router = inject(Router);

  searchTerm   = signal('');
  filtroEstado = signal('Todos');

  personas = computed(() => {
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

  verPersona(id: string): void {
    this.router.navigate(['/voluntarios/personas/editar', id]);
  }

  eliminar(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Eliminar esta persona?')) {
      this.svc.delete(id).subscribe({
        next: () => console.log('Persona eliminada'),
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }
}
