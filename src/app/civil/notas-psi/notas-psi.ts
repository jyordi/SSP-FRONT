import { Component,Input,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Civico } from '../../services/civico';
import { SessionDetalleC } from '../session-detalle-c/session-detalle-c';
import { SessionService } from '../../services/session';
@Component({
  standalone:true,
  selector: 'app-notas-psi',
  imports: [CommonModule, FormsModule,SessionDetalleC],
  templateUrl: './notas-psi.html',
  styleUrls: ['./notas-psi.css'],
})

export class NotasPsi implements OnInit {
@Input() expediente: any;
 total = 0;
buscador = '';
resultado: any = null;
noEncontrado = false;
notas: any[] = [];

//  MODAL
notaSeleccionada: any = null;
mostrarModal = false;


constructor(
  private civico: Civico, 
  private router: Router,
  private session: SessionService
){}

get puedeEditar(): boolean {
  return this.session.esPsicologo(); // Admin solo visualiza
}
ngOnInit() {
  this.cargar();
}

cargar() {
  const id = this.expediente?.idUUID;

  this.civico.listarSesiones(id).subscribe({
    next: res => this.notas = res,
    error: err => {
      if (err.status !== 403) console.error(err);
      this.notas = [];
    }
  });

  this.civico.contarSesiones(id).subscribe({
    next: res => this.total = res.total ?? res ?? 0,
    error: err => {
      if (err.status !== 403) console.error(err);
      this.total = 0;
    }
  });
}

// 🔍 BUSCAR
buscar() {
  const id = this.expediente?.idUUID;

  if (!this.buscador) {
    this.resultado = null;
    this.noEncontrado = false;
    return;
  }

  this.civico.obtenerSesion(id, Number(this.buscador))
    .subscribe({
      next: (res) => {
        this.resultado = res;
        this.noEncontrado = false;
      },
      error: () => {
        this.resultado = null;
        this.noEncontrado = true;
      }
    });
}

// VER DETALLE 
verDetalle(nota: any) {
  this.mostrarModal = false; // reset

  setTimeout(() => {
    this.notaSeleccionada = { ...nota }; //  mejor práctica
    this.mostrarModal = true;
  }, 0);
console.log(this.notaSeleccionada);

}

//  NUEVA NOTA
nuevaNota() {
  this.router.navigate(['/segui-psi', this.expediente.idUUID]);
}

descargarPDF() {
  const id = this.expediente?.idUUID;
  if (!id) return;

  this.civico.generarDocumentoPDF('nota-evolucion', id).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nota_Evolucion_${this.expediente.beneficiario?.nombre || 'Paciente'}.pdf`;
      a.click();
    },
    error: (err) => {
      let msg = err.error?.message || err.message;
      if (Array.isArray(msg)) msg = msg.join(', ');
      alert(`Aún no se puede realizar esta acción: ${msg}`);
    }
  });
}
}
