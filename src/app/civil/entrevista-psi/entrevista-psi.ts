import { Component,Input } from '@angular/core';
import { Civico } from '../../services/civico';
import { CommonModule } from '@angular/common';
import { FormuPsico } from '../formu-psico/formu-psico';
import { SessionService } from '../../services/session';
@Component({
  standalone:true,
  selector: 'app-entrevista-psi',
  imports: [CommonModule, FormuPsico],
  templateUrl: './entrevista-psi.html',
  styleUrls: ['./entrevista-psi.css'],
})
export class EntrevistaPsi {
@Input() expediente: any;
  mostrarForm = false;

  // Inyectamos el servicio
  constructor(
    private civicoService: Civico,
    private session: SessionService
  ) {}

  get puedeEditar(): boolean {
    return this.session.esPsicologo(); // Admin solo visualiza
  }

  ngOnInit() {
    // Cuando cargue el componente, vamos a buscar si ya existe un F1 para este paciente
    if (this.expediente && this.expediente.idUUID) {
      // Necesitas crear este método en tu servicio si no lo tienes:
      // return this.http.get(`${this.BASE}/civico/f1/expediente/${expedienteId}`);
      this.civicoService.obtenerF1PorExpediente(this.expediente.idUUID).subscribe({
        next: (data) => {
          // Si el backend responde con datos, los guardamos en la variable
          // Esto hará que desaparezca el botón de Crear automáticamente
          this.expediente.psicologia = data;
        },
        error: (err) => {
          // Si da un error 404, significa que NO existe, y está perfecto.
          // Dejamos que aparezca el botón de "Crear".
          console.log('No existe entrevista previa, se mostrará el botón de Crear');
        }
      });
    }
  }

  abrirFormulario() {
    this.mostrarForm = true;
  }

  onEntrevistaGuardada(data: any) {
    this.expediente.psicologia = data;
    this.mostrarForm = false;
  }
}
