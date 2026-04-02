
import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login';
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';
import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { authGuard } from './guards/auth-guard';


export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔓 pública
  { path: 'login', component: LoginComponent },

  // 🔐 TODAS PROTEGIDAS
  { path: 'seleccion', component: SeleccionComponent, canActivate: [authGuard] },
  { path: 'expedientes', component: ListadoExpedientesComponent, canActivate: [authGuard] },
  { path: 'nuevo-usuario-penal', component: PenalForm, canActivate: [authGuard] },
  { path: 'vp', component: ValoracionPenalComponent, canActivate: [authGuard] },
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent, canActivate: [authGuard] },

  {
    path: 'trabajo-social',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/estudio-trabajo-social/estudio-trabajo-social.component')
        .then(m => m.EstudioTrabajoSocialComponent),
    title: 'Estudio de Trabajo Social — Reconecta con la Paz',
  },

  {
    path: 'plan-individualizado',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/plan-trabajo-individualizado/plan-trabajo-individualizado.component')
        .then(m => m.PlanTrabajoIndividualizadoComponent),
    title: 'Plan de Trabajo Individualizado — Reconecta con la Paz',
  },

  {
    path: 'caratura-expediente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/caratura-expediente/caratura-expediente')
        .then(m => m.CaraturaExpediente),
    title: 'Carátula del Expediente — Reconecta con la Paz',
  },

  {
    path: 'proyecto-vida',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./proyecto-vida/proyecto-vida')
        .then(m => m.ProyectoVida),
    title: 'Plan de Trabajo Individual',
  },
];

