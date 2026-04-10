import { Component,Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotasPsi } from '../notas-psi/notas-psi';
import { EntrevistaPsi } from '../entrevista-psi/entrevista-psi';
import { PlanVidaComponent } from '../plan-vida/plan-vida';

@Component({
  standalone:true,
  selector: 'app-psico-tabs',
  imports: [CommonModule, NotasPsi, EntrevistaPsi, PlanVidaComponent],
  templateUrl: './psico-tabs.html',
  styleUrls: ['./psico-tabs.css'],
})
export class PsicoTabs {
@Input() expediente: any;

  tab: 'entrevista' | 'notas' | 'plan-vida' = 'notas';

}
