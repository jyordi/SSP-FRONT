import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonasCsvService, CsvUploadResponse } from '../../services/personas-csv.service';

@Component({
  selector: 'app-csv-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './csv-modal.html',
  styleUrl: './csv-modal.css'
})
export class CsvModal {
  @Output() cerrar = new EventEmitter<void>();
  @Output() csvCargado = new EventEmitter<void>();

  private csvService = inject(PersonasCsvService);

  archivoSeleccionado: File | null = null;
  cargando = false;
  resultado: CsvUploadResponse | null = null;

  descargarFormato(): void {
    this.csvService.descargarTemplate();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado = input.files[0];
      this.resultado = null;
    }
  }

  cargarCsv(): void {
    if (!this.archivoSeleccionado) return;

    this.cargando = true;
    this.resultado = null;

    this.csvService.uploadCsv(this.archivoSeleccionado).subscribe({
      next: (res) => {
        this.resultado = res;
        this.cargando = false;
        this.archivoSeleccionado = null;

        // Si se cargó exitosamente, refrescar la lista
      if (res.creados > 0 || res.actualizados > 0) {
  this.csvCargado.emit(); // Refresca la lista
}
      },
      error: (err) => {
        console.error('Error al cargar CSV:', err);
        this.cargando = false;
        this.resultado = {
          mensaje: 'Error al procesar el archivo',
          total: 0,
          creados: 0,
          actualizados:0,
          fallidos: 0,
          errores: [{ fila: 0, mensaje: err.message || 'Error desconocido' }]
        };
      }
    });
  }

  close(): void {
    this.cerrar.emit();
  }
}
