import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { PerfilPsicologa } from './civil/perfil-psicologa/perfil-psicologa';
import { PerfilGuia } from './civil/perfil-guia/perfil-guia';
import { PerfilTrabajoS } from './civil/perfil-trabajo-s/perfil-trabajo-s';
import { PerfilAdmin } from './civil/perfil-admin/perfil-admin';
import { LoginComponent } from './auth/login/login';
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';
import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { authGuard } from './guards/auth-guard';

 
export const routes: Routes = [

  //  Inicio
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  //  Pública
  { path: 'login', component: LoginComponent },

  //  Protegidas principales
  { path: 'seleccion', component: SeleccionComponent, canActivate: [authGuard] },
  { path: 'expedientes', component: ListadoExpedientesComponent, canActivate: [authGuard] },
  { path: 'nuevo-usuario-penal', component: PenalForm, canActivate: [authGuard] },
  { path: 'vp', component: ValoracionPenalComponent, canActivate: [authGuard] },
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent, canActivate: [authGuard] },

  //  Perfiles (LAS QUE PEDISTE)
  { path: 'psicologa', component: PerfilPsicologa, canActivate: [authGuard] },
  { path: 'guia', component: PerfilGuia, canActivate: [authGuard] },
  { path: 'trabajos', component: PerfilTrabajoS, canActivate: [authGuard] },
  { path: 'admin', component: PerfilAdmin, canActivate: [authGuard] },
  { path: 'formu-psico', component: FormuPsico, canActivate: [authGuard] },
  { path: 'segui-psi', component: SeguimientoPsi, canActivate: [authGuard] },

  //  Otras rutas
  {
    path: 'trabajo-social',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/estudio-trabajo-social/estudio-trabajo-social.component')
        .then(m => m.EstudioTrabajoSocialComponent),
  },
  {
    path: 'plan-individualizado',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/plan-trabajo-individualizado/plan-trabajo-individualizado.component')
        .then(m => m.PlanTrabajoIndividualizadoComponent),
  },
  {
    path: 'caratura-expediente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/caratura-expediente/caratura-expediente')
        .then(m => m.CaraturaExpediente),
  },
  {
    path: 'proyecto-vida',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./proyecto-vida/proyecto-vida')
        .then(m => m.ProyectoVida),
  },

  // Cívico
  {
    path: 'nuevo-expediente-civico',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nuevo-expediente-civico/nuevo-expediente-civico')
        .then(m => m.NuevoExpedienteCivicoComponent),
  },

  // 🔴 ÚNICO wildcard (AQUÍ DECIDES)
  { path: '**', redirectTo: 'login' }

];  