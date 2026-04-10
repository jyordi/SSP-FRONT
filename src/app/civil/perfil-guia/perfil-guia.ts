import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Civico } from '../../services/civico';
import { SessionService } from '../../services/session';
import { GuiaTabsComponent } from '../guia-tabs/guia-tabs';
import { NavbarReconectaComponent } from "../../shared/navbar-reconecta/navbar-reconecta";

@Component({
  selector: 'app-perfil-guia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, GuiaTabsComponent, NavbarReconectaComponent],
  templateUrl: './perfil-guia.html',
  styleUrl: './perfil-guia.css',
})
export class PerfilGuia implements OnInit {


  // Vistas principales de la barra lateral
  vistaLateral: string = 'mis-asignados'; 
  
  // Controla si vemos la lista de jóvenes o el perfil de uno en específico
  vistaPrincipal: 'lista' | 'detalle' = 'lista';
  
  // Controla qué pestaña del perfil estamos viendo
  tabActual: 'horas' | 'inasistencias' | 'asistencia' | 'planF3' = 'horas';
  
  // Usuario seleccionado actualmente
  jovenSeleccionado: any = null;

  // Datos de los jóvenes asignados desde el servidor
  jovenesAsignados: any[] = [];

  showLogoutModal: boolean = false;

  constructor(
    private router: Router,
    private civico: Civico,
    private session: SessionService
  ) {}

  ngOnInit() {
    this.cargarAsignados();
  }

  cargarAsignados() {
    const guiaId = Number(this.session.getUserId() || 1);
    this.civico.obtenerAsignadosGuia(guiaId).subscribe({
      next: (res: any[]) => {
        this.jovenesAsignados = res || [];
      },
      error: (err) => console.error('Error cargando asignados:', err)
    });
  }

  // Navegación del menú lateral
  cambiarVistaLateral(vista: string) {
    this.vistaLateral = vista;
    if (vista === 'mis-asignados') {
      this.volverALista();
    }
  }

  // Abrir el perfil de un joven
  verDetalle(joven: any) {
    this.jovenSeleccionado = joven;
    this.vistaPrincipal = 'detalle';
  }

  // Regresar a la lista de asignados
  volverALista() {
    this.vistaPrincipal = 'lista';
    this.jovenSeleccionado = null;
    this.cargarAsignados();
  }

  openLogoutModal() {
    this.showLogoutModal = true;
  }
  closeLogoutModal() {
    this.showLogoutModal = false;
  }
  logout() {
    this.session.logout();
    this.router.navigate(['/login']);
  }

}