import { Component,Input } from '@angular/core';

@Component({
  selector: 'app-ficha-psi',
  imports: [],
  templateUrl: './ficha-psi.html',
  styleUrl: './ficha-psi.css',
})
export class FichaPsi {
@Input() expediente: any;
}
