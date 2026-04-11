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
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";
import { ToastService } from '../../services/toast.service';

import { ToastComponent } from '../../shared/toast/toast.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PsicoTabs, EstudioTsCivicoComponent, PlanIndividualComponent, GuiaTabsComponent, FichaTecnica, NavbarReconectaComponent, ToastComponent],

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
  subiendoFirmado = false;
  
  // Datos CENTRALIZADOS para todos los componentes
  datosCompletos: any = {
    expediente: null,
    beneficiario: null,
    f1: null,
    f2: null,
    f3: null,
    ultimoSync: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExpedientesService,
    private session: SessionService,
    private civico: Civico,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.role = this.session.getRole();
    const id = this.route.snapshot.params['id'];
    this.cargarDetalleCentralizado(id);

    if (this.esPsicologo()) {
      this.tabActual = 'psicologia';
    } else if (this.esTrabajadorSocial()) {
      this.tabActual = 'trabajosocial';
    } else if (this.esGuia()) {
      this.tabActual = 'guias';
    }
  }

  /**
   * Carga centralizada de toda la información del expediente y sus fases
   * Primero revisa el caché local, si no existe o es antiguo, consulta al servidor.
   */
  cargarDetalleCentralizado(idUUID: string) {
    this.loading = true;
    
    // 1. Intentar cargar desde Caché Local
    const cacheKey = `detalle_civico_${idUUID}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        this.datosCompletos = parsed;
        this.expediente = parsed.expediente;
        console.log(">>> CARGADO DESDE CACHE LOCAL:", this.datosCompletos);
        
        // Finalizamos carga visual
        this.loading = false;
        this.cargarNotas();
        
        // Podríamos hacer una validación de "frescura" aquí, pero para fines de UX
        // asumimos que es válido por ahora.
      } catch (e) {
        console.error("Error al parsear cache:", e);
      }
    }

    // 2. Siempre consultar al back para estar actualizados (o si no hay cache)
    this.civico.getExpedienteCivico(idUUID).subscribe({
      next: (res: any) => {
        this.expediente = res;
        this.datosCompletos.expediente = res;
        
        // 1. Cargar Beneficiario si no viene
        if (!res.beneficiario && res.beneficiarioId) {
          this.civico.obtenerBeneficiario(res.beneficiarioId).subscribe({
            next: (b) => {
              this.expediente.beneficiario = b;
              this.datosCompletos.beneficiario = b;
              this.sincronizarCache();
            }
          });
        } else {
          this.datosCompletos.beneficiario = res.beneficiario;
        }

        // 2. Cargar F1 (Entrevista / Psicología)
        this.civico.obtenerF1PorExpediente(idUUID).subscribe({
          next: (f1) => {
            this.datosCompletos.f1 = f1;
            this.sincronizarCache();
          },
          error: (err) => {
            if (err.status === 403) console.log("🔒 F1 bloqueado por permisos (Rol Guía)");
            else console.error("Error al cargar F1:", err);
          }
        });

        // 3. Cargar F2 (Trabajo Social)
        this.civico.obtenerF2PorExpediente(idUUID).subscribe({
          next: (f2) => {
            this.datosCompletos.f2 = f2;
            this.sincronizarCache();
          },
          error: (err) => {
            if (err.status === 403) console.log("🔒 F2 bloqueado por permisos (Rol Guía)");
            else console.error("Error al cargar F2:", err);
          }
        });

        // 4. Cargar F3 (Plan de Trabajo)
        this.civico.obtenerF3PorExpediente(idUUID).subscribe({
          next: (f3) => {
            this.datosCompletos.f3 = f3;
            this.sincronizarCache();
          },
          error: (err) => {
            // El 404 es normal si aún no lo crean
            if (err.status === 404) console.log("📝 F3 aún no creado para este expediente.");
            else console.error("Error al cargar F3:", err);
          }
        });

        this.loading = false;
        this.cargarNotas();
        this.sincronizarCache();
        console.log(">>> DATOS COMPLETOS (BACKEND SINC):", this.datosCompletos);
      },
      error: () => {
        this.loading = false;
        if (!this.expediente) alert('Error al cargar expediente desde el servidor');
      }
    });
  }

  private sincronizarCache() {
    this.datosCompletos.ultimoSync = new Date().toISOString();
    localStorage.setItem(`detalle_civico_${this.expediente?.idUUID}`, JSON.stringify(this.datosCompletos));
  }

  cambiarTab(tab: string) {
    this.tabActual = tab;
  }

  //  LISTAR SESIONES
  cargarNotas() {
    const id = this.expediente?.idUUID;
    if (!id) return;

    if (!this.esPsicologo() && !this.esAdmin()) return;

    this.civico.listarSesiones(id).subscribe({
      next: (res: any) => {
        this.notas = res;
      },
      error: (err: any) => {
        if (err.status !== 403) console.error("Error cargando notas en detalle:", err);
      }
    });
  }



  generarPDF(tipo: string) {
    const id = this.expediente?.idUUID;
    if (!id) return;

    this.civico.generarDocumentoPDF(tipo, id).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url);
      },
      error: (err: any) => {
        let msg = err.error?.message || err.message;
        if (Array.isArray(msg)) msg = msg.join(', ');
        alert(`Aún no se puede realizar esta acción: ${msg}`);
      }
    });
  }

  subirFirmado(event: any, tipo: 'CANALIZACION' | 'INCORPORACION') {
    const file = event.target?.files?.[0];
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
        this.toast.showSuccess("Documento subido y vinculado correctamente.");
      },
      error: (err: any) => {
        this.subiendoFirmado = false;
        this.toast.showError("Error al subir: " + (err.error?.message || "Archivo no válido o error de red"));
      }
    });
  }

  guardarCambios() {
    this.guardando = true;

    const id = this.expediente.idUUID || this.expediente.id;
    this.civico.actualizarExpedienteCivico(id, this.expediente)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.toast.showSuccess('Información actualizada correctamente');
        },
        error: () => {
          this.guardando = false;
          this.toast.showError('Error al actualizar la información');
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