import { Component,Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotasPsi } from '../notas-psi/notas-psi';
import { FichaPsi } from '../ficha-psi/ficha-psi';
import { EntrevistaPsi } from '../entrevista-psi/entrevista-psi';
@Component({
  standalone:true,
  selector: 'app-psico-tabs',
  imports: [CommonModule, NotasPsi, FichaPsi, EntrevistaPsi],
  templateUrl: './psico-tabs.html',
  styleUrls: ['./psico-tabs.css'],
})
export class PsicoTabs {
@Input() expediente: any;

  tab: 'entrevista' | 'notas' | 'ficha' = 'notas';

}
