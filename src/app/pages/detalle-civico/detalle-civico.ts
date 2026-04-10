import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpedientesService } from '../../services/expedientes';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session';
import { FormsModule } from '@angular/forms';
import { Civico } from '../../services/civico';
import { HttpClient } from '@angular/common/http';
import { SessionDetalleC } from '../../civil/session-detalle-c/session-detalle-c';
import { PsicoTabs } from "../../civil/psico-tabs/psico-tabs";
import { EstudioTsCivicoComponent } from '../../civil/estudio-ts-civico/estudio-ts-civico';
import { PlanIndividualComponent } from '../../civil/plan-ts-civico/plan-ts-civico';
import { GuiaTabsComponent } from '../../civil/guia-tabs/guia-tabs';
import { FichaTecnica } from '../../civil/ficha-tecnica/ficha-tecnica';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PsicoTabs, EstudioTsCivicoComponent, PlanIndividualComponent, GuiaTabsComponent, FichaTecnica],

  templateUrl: './detalle-civico.html',
  styleUrls: ['./detalle-civico.css']  
})
export class DetalleCivicoComponent implements OnInit {
notaSeleccionada: any = null;


  tabActual: string = 'psicologia';
  tsSubTab: string = 'estudio';
  expediente: any;
  loading = true;
  guardando = false;
  role = '';

  //  NUEVO
  notas: any[] = [];
  historialDocumentos: any[] = [];
  cargandoHistorial = false;
  subiendoFirmado = false;
  

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private civico: Civico
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];

    this.civico.getResumenCivico(id).subscribe({
      next: (res: any) => {
        this.expediente = res;
        this.loading = false;

        this.cargarNotas(); //  CLAVE
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar expediente');
      }
    });

    if (this.esPsicologo()) {
      this.tabActual = 'psicologia';
    } else if (this.esTrabajadorSocial()) {
      this.tabActual = 'trabajosocial';
    } else if (this.esGuia()) {
      this.tabActual = 'guias';
    }
  }

  cambiarTab(tab: string) {
    this.tabActual = tab;
    if (tab === 'oficio') {
      this.cargarHistorial();
    }
  }

  //  LISTAR SESIONES
  cargarNotas() {
    const id = this.expediente?.idUUID;
    if (!id) return;

    // Solo cargamos notas si somos psicologo o admin, de lo contrario el backend puede rechazar
    if (!this.esPsicologo() && !this.esAdmin()) return;

    this.civico.listarSesiones(id).subscribe({
      next: (res) => {
        this.notas = res;
      },
      error: (err) => {
        if (err.status !== 403) console.error("Error cargando notas en detalle:", err);
      }
    });
  }

  cargarHistorial() {
    const id = this.expediente?.idUUID;
    if (!id) return;
    this.cargandoHistorial = true;
    this.civico.obtenerHistorialDocumentos(id).subscribe({
      next: (res) => {
        this.historialDocumentos = res;
        this.cargandoHistorial = false;
      },
      error: () => {
        this.cargandoHistorial = false;
      }
    });
  }

  generarPDF(tipo: string) {
    const id = this.expediente?.idUUID;
    if (!id) return;

    this.civico.generarDocumentoPDF(tipo, id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url);
        this.cargarHistorial(); // Refrescar para ver el nuevo registro
      },
      error: (err) => {
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
      }
    });
  }

  subirFirmado(event: any, tipo: 'CANALIZACION' | 'INCORPORACION') {
    const file = event.target.files[0];
    if (!file) return;

    const id = this.expediente?.idUUID;
    if (!id) return;

    this.subiendoFirmado = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expedienteId', id);
    formData.append('tipo', tipo);

    this.civico.subirDocumentoEscaneado(formData).subscribe({
      next: () => {
        this.subiendoFirmado = false;
        alert("Documento subido y vinculado correctamente.");
        this.cargarHistorial();
      },
      error: (err) => {
        this.subiendoFirmado = false;
        alert("Error al subir: " + (err.error?.message || "Archivo no válido o error de red"));
      }
    });
  }

  

  guardarCambios() {
    this.guardando = true;

    this.civico.updateCivico(this.expediente.id, this.expediente)
      .subscribe({
        next: () => {
          this.guardando = false;
          alert('Actualizado correctamente');
        },
        error: () => {
          this.guardando = false;
          alert('Error al actualizar');
        }
      });
  }

  volver() {
    this.router.navigate(['/expedientes']);
  }

  esAdmin(): boolean { return this.session.esAdmin(); }
  esPsicologo(): boolean { return this.session.esPsicologo(); }
  esTrabajadorSocial(): boolean { return this.session.esTrabajadorSocial(); }
  esGuia(): boolean { return this.session.esGuia(); }

  get puedeEditarGeneral(): boolean {
    return this.esAdmin();
  }

  //  NAVEGACIÓN
  irPsico(tipo: string) {

    if (tipo === 'formu-psico') {
      this.router.navigate(['/formu-psico']);

    } else if (tipo === 'segui-psi') {

      const id = this.expediente?.idUUID;

      if (!id) {
        alert("Error: expediente sin ID");
        return;
      }

      this.router.navigate(['/segui-psi', id]);
    }
  }
}