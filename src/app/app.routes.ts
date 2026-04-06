import { Routes } from '@angular/router';

// 🔹 AUTH
import { LoginComponent } from './auth/login/login';
import { authGuard } from './guards/auth-guard';

// 🔹 DASHBOARD
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';

// 🔹 COMPONENTES
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { PerfilPsicologa } from './civil/perfil-psicologa/perfil-psicologa';
import { PerfilGuia } from './civil/perfil-guia/perfil-guia';
import { PerfilTrabajoS } from './civil/perfil-trabajo-s/perfil-trabajo-s';
import { PerfilAdmin } from './civil/perfil-admin/perfil-admin';

import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { NuevoUsuarioComponent } from './pages/nuevo-usuario/nuevo-usuario';

export const routes: Routes = [

  // 🔴 DEFAULT
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔓 PUBLIC
  { path: 'login', component: LoginComponent },

  // 🔐 PROTEGIDAS
  { path: 'seleccion', component: SeleccionComponent, canActivate: [authGuard] },
  { path: 'expedientes', component: ListadoExpedientesComponent, canActivate: [authGuard] },

  { path: 'nuevo-usuario', component: NuevoUsuarioComponent, canActivate: [authGuard] },
  { path: 'nuevo-usuario-penal', component: PenalForm, canActivate: [authGuard] },

  { path: 'vp', component: ValoracionPenalComponent, canActivate: [authGuard] },
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent, canActivate: [authGuard] },

  { path: 'formu-psico', component: FormuPsico, canActivate: [authGuard] },
  { path: 'segui-psi', component: SeguimientoPsi, canActivate: [authGuard] },

  { path: 'psicologa', component: PerfilPsicologa, canActivate: [authGuard] },
  { path: 'guia', component: PerfilGuia, canActivate: [authGuard] },
  { path: 'trabajos', component: PerfilTrabajoS, canActivate: [authGuard] },
  { path: 'admin', component: PerfilAdmin, canActivate: [authGuard] },

  // 🔥 LAZY LOADING
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

  {
    path: 'nuevo-expediente-penal',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nuevo-expediente-penal/nuevo-expediente-penal')
        .then(m => m.NuevoExpedientePenalComponent),
  },

  // 🔚 FINAL
  { path: '**', redirectTo: 'login' }

];