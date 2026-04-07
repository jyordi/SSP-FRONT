import { Component,Input,EventEmitter,Output } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  standalone:true,
  selector: 'app-session-detalle-c',
  imports: [CommonModule],
  templateUrl: './session-detalle-c.html',
  styleUrls: ['./session-detalle-c.css'],
})
export class SessionDetalleC {
  @Input() nota: any;
  @Input() visible: boolean = false;
  @Output() cerrarModal = new EventEmitter<void>();
  cerrar() {
    this.visible = false;
  }

}
