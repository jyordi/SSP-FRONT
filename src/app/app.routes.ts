import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { PerfilPsicologa } from './civil/perfil-psicologa/perfil-psicologa';
import { PerfilGuia } from './civil/perfil-guia/perfil-guia';
import { PerfilTrabajoS } from './civil/perfil-trabajo-s/perfil-trabajo-s';
import { PerfilAdmin } from './civil/perfil-admin/perfil-admin';

export const routes: Routes = [
    {
        path: 'formu-psico',
        component: FormuPsico
    },
    {
        path: 'segui-psi',
        component: SeguimientoPsi
    },
    {
        path:'psicologa',
        component:PerfilPsicologa
    },
    {
        path:'guia',
        component:PerfilGuia
    },
    {
        path:'trabajos',
        component:PerfilTrabajoS
    },
    {
        path:'admin',
        component:PerfilAdmin
    },
    {
        path:'**',
        redirectTo:'psicologa'
    }
import { LoginComponent } from './auth/login/login';
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';
import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { NuevoUsuarioComponent } from './pages/nuevo-usuario/nuevo-usuario';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  // Redireccionamiento principal
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔓 Ruta pública
  { path: 'login', component: LoginComponent },

  // 🔐 Rutas protegidas
  { path: 'seleccion', component: SeleccionComponent, canActivate: [authGuard] },
  { path: 'expedientes', component: ListadoExpedientesComponent, canActivate: [authGuard] },
  { path: 'nuevo-usuario', component: NuevoUsuarioComponent, canActivate: [authGuard] },
  { path: 'nuevo-usuario-penal', component: PenalForm, canActivate: [authGuard] },
  { path: 'vp', component: ValoracionPenalComponent, canActivate: [authGuard] },
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent, canActivate: [authGuard] },
  {
    path: 'formu-psico',
    component: FormuPsico,
    canActivate: [authGuard]
  },

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

  {
  path: 'nuevo-expediente-penal',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/nuevo-expediente-penal/nuevo-expediente-penal')
      .then(m => m.NuevoExpedientePenalComponent),
  title: 'Nuevo Expediente Penal'
},

  // VOLUNTARIOS - Personas
  {
    path: 'voluntarios/personas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/personas/personas-list/personas-list')
        .then(m => m.PersonasList)
  },
  {
    path: 'voluntarios/personas/nuevo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },
  {
    path: 'voluntarios/personas/editar/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },

  // VOLUNTARIOS - Actividades
  {
    path: 'voluntarios/actividades',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividades-list/actividades-list')
        .then(m => m.ActividadesList)
  },
  {
    path: 'voluntarios/actividades/nueva',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },
  {
    path: 'voluntarios/actividades/editar/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },

  //civico
{
  path: 'nuevo-expediente-civico',
  canActivate: [authGuard], // opcional pero recomendado
  loadComponent: () =>
    import('./pages/nuevo-expediente-civico/nuevo-expediente-civico')
      .then(m => m.NuevoExpedienteCivicoComponent),
  title: 'Nuevo Expediente Cívico'
},

{
  path: 'detalle-penal/:id',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/detalle-penal/detalle-penal')
      .then(m => m.DetallePenalComponent),
  title: 'Detalle Expediente Penal'
},

{
  path: 'detalle-civico/:id',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/detalle-civico/detalle-civico')
      .then(m => m.DetalleCivicoComponent),
  title: 'Detalle Expediente Cívico'
},

// FINAL
{ path: '**', redirectTo: 'login' }


];
