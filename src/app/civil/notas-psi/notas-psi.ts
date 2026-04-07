import { Component,Input,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Civico } from '../../services/civico';
import { SessionDetalleC } from '../session-detalle-c/session-detalle-c';
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


constructor(private civico: Civico, private router: Router){}
ngOnInit() {
  this.cargar();
}

cargar() {
  const id = this.expediente?.idUUID;

  this.civico.listarSesiones(id).subscribe(res => {
    this.notas = res;
  });
  this.civico.contarSesiones(id).subscribe(res => {
    this.total = res.total ?? res ?? 0;
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
}
