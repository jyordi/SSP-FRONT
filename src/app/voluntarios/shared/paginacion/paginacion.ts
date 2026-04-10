import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (totalPaginas() > 1) {
      <div class="paginacion">
        <button
          class="btn-pag"
          [disabled]="paginaActual() === 1"
          (click)="cambiarPagina(1)">
          « Primero
        </button>

        <button
          class="btn-pag"
          [disabled]="paginaActual() === 1"
          (click)="cambiarPagina(paginaActual() - 1)">
          ‹ Anterior
        </button>

        <div class="numeros-container">
          @for (num of paginasVisibles(); track num) {
            <button
              class="btn-num"
              [class.activo]="num === paginaActual()"
              (click)="cambiarPagina(num)">
              {{ num }}
            </button>
          }
        </div>

        <button
          class="btn-pag"
          [disabled]="paginaActual() === totalPaginas()"
          (click)="cambiarPagina(paginaActual() + 1)">
          Siguiente ›
        </button>

        <button
          class="btn-pag"
          [disabled]="paginaActual() === totalPaginas()"
          (click)="cambiarPagina(totalPaginas())">
          Último »
        </button>
      </div>
    }
  `,
  styles: [`
    .paginacion {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      padding: 1.5rem;
      /* Color guinda/oscuro de la cabecera */
      background: #701c30;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .numeros-container {
      display: flex;
      gap: 0.5rem;
    }

    .btn-pag {
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      /* Transparente para dejar ver el fondo guinda */
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-pag:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
      border-color: #ffffff;
    }

    .btn-pag:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-num {
      border: 1px solid #d4af37; /* Dorado del borde de la tabla */
      min-width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      background: #ffffff;
      color: #701c30;
      transition: all 0.2s;
    }

    .btn-num:hover:not(.activo) {
      background: #fdf2f4;
      transform: scale(1.05);
    }

    .btn-num.activo {
      background: #d4af37; /* Dorado para resaltar la página activa */
      color: #ffffff;
      border-color: #d4af37;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
    }
  `]
})
export class Paginacion {
  @Input() set totalItems(value: number) {
    this._totalItems.set(value);
  }
  @Input() set itemsPorPagina(value: number) {
    this._itemsPorPagina.set(value);
  }
  @Input() set paginaActualInput(value: number) {
    this._paginaActual.set(value);
  }

  @Output() paginaCambiada = new EventEmitter<number>();

  private _totalItems = signal(0);
  private _itemsPorPagina = signal(5);
  private _paginaActual = signal(1);

  paginaActual = this._paginaActual.asReadonly();

  totalPaginas = computed(() =>
    Math.ceil(this._totalItems() / this._itemsPorPagina())
  );

  paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this._paginaActual();
    const maxVisible = 7;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let inicio = Math.max(1, actual - 3);
    let fin = Math.min(total, inicio + maxVisible - 1);

    if (fin - inicio < maxVisible - 1) {
      inicio = Math.max(1, fin - maxVisible + 1);
    }

    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  });

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this._paginaActual.set(pagina);
      this.paginaCambiada.emit(pagina);
    }
  }
}
