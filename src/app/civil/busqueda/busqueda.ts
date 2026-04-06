import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-busqueda',
  imports: [FormsModule],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css',
})
export class Busqueda {
curp: string = '';

buscar() {
  if (!this.curp) return;

  console.log('Buscando CURP:', this.curp);

  // Aquí llamas a tu API
  // this.servicio.buscarPorCurp(this.curp).subscribe(...)
}
}
