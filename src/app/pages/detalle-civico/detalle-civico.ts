import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-civico.html'
})
export class DetalleCivicoComponent implements OnInit {

  expediente: any;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private service: ExpedientesService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    this.service.getCivicoById(id).subscribe({
      next: (res) => {
        this.expediente = res;
        this.loading = false;
      }
    });
  }
}