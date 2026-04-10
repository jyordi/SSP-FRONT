import { Component,Input,EventEmitter,Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Civico } from '../../services/civico';
import { FormsModule } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';

@Component({
  standalone:true,
  selector: 'app-session-detalle-c',
  imports: [CommonModule, FormsModule],
  templateUrl: './session-detalle-c.html',
  styleUrls: ['./session-detalle-c.css'],
  encapsulation: ViewEncapsulation.None
})
export class SessionDetalleC {

  @Input() nota: any;
  @Input() visible: boolean = false;
//  @Output() cerrarModal = new EventEmitter<void>();
  cerrar() {
    this.visible = false;
  }
  modalAbierto = false;
tipo: string = '';

seguimiento: any = {};
intervencion: any = {};
proximaSesion: any = {};

constructor(private Civico: Civico) {}
abrirModal(tipo: string) {
  this.tipo = tipo;
  this.modalAbierto = true;

  // 🔥 precargar datos reales
  this.seguimiento = {
    planTerapeutico: this.nota?.planTerapeutico,
    avancePercibido: this.nota?.avancePercibido,
    observaciones: this.nota?.observaciones
  };

  this.intervencion = {
    descripcionIntervencion: this.nota?.descripcionIntervencion,
    estrategiaAplicada: this.nota?.estrategiaAplicada,
    actividadesAsignadasUsuario: this.nota?.actividadesAsignadasUsuario
  };

  this.proximaSesion = {
    fechaProximaSesion: this.nota?.fechaProximaSesion
  };
}

cerrarModal() {
  this.modalAbierto = false;
}

guardar() {
  let body: any = {};

  if (this.tipo === 'seguimiento') body = this.seguimiento;
  if (this.tipo === 'intervencion') body = this.intervencion;
  if (this.tipo === 'fecha') body = this.proximaSesion;

  this.Civico.actualizarSesion(this.nota.idUUID, body).subscribe({
    next: () => {
      // actualizar UI sin recargar
      Object.assign(this.nota, body);

      this.modalAbierto = false;
    },
    error: (err) => console.error(err)
  });
}

}
