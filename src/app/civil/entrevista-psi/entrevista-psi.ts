import { Component,Input } from '@angular/core';

@Component({
  selector: 'app-entrevista-psi',
  imports: [],
  templateUrl: './entrevista-psi.html',
  styleUrls: ['./entrevista-psi.css'],
})
export class EntrevistaPsi {
@Input() expediente: any;
}
