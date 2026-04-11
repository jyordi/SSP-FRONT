import { Routes } from '@angular/router';

// 🔹 AUTH
import { LoginComponent } from './auth/login/login';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';

// 🔹 DASHBOARD
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';

// 🔹 USUARIOS
import { NuevoUsuarioComponent } from './pages/nuevo-usuario/nuevo-usuario';

// 🔹 PENAL
import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { PlanDetalleAdminComponent } from './components/plan-detalle-admin/plan-detalle-admin';

// 🔹 CIVIL / PSICO
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { PerfilPsicologa } from './civil/perfil-psicologa/perfil-psicologa';
import { PerfilGuia } from './civil/perfil-guia/perfil-guia';
import { PerfilTrabajoS } from './civil/perfil-trabajo-s/perfil-trabajo-s';
import { PerfilAdmin } from './civil/perfil-admin/perfil-admin';

const VOLUNTARIOS_ALLOWED_ROLES = ['admin', 'coordinador', 'tallerista'];

export const routes: Routes = [

  // 🔥 ROOT
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔓 LOGIN
  { path: 'login', component: LoginComponent },

  // 🔐 DASHBOARD
  { path: 'seleccion', component: SeleccionComponent, canActivate: [authGuard] },
  { path: 'expedientes', component: ListadoExpedientesComponent, canActivate: [authGuard] },
  { path: 'plan-detalle-admin/:id', component: PlanDetalleAdminComponent, canActivate: [authGuard]},

  // 🔐 USUARIOS
  { path: 'nuevo-usuario', component: NuevoUsuarioComponent, canActivate: [authGuard] },

  // 🔐 PENAL
  { path: 'nuevo-usuario-penal', component: PenalForm, canActivate: [authGuard] },
  { path: 'vp', component: ValoracionPenalComponent, canActivate: [authGuard] },
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent, canActivate: [authGuard] },

  // 🔐 PSICOLOGÍA (🔥 AQUÍ ESTABA TU PROBLEMA)
  { path: 'formu-psico', component: FormuPsico, canActivate: [authGuard] },
  { path: 'segui-psi/:id', component: SeguimientoPsi, canActivate: [authGuard] },

  // 🔐 MÓDULOS
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

  // 🔐 VOLUNTARIOS (SIN DUPLICADOS)
  {
    path: 'voluntarios/personas',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/personas/personas-list/personas-list')
        .then(m => m.PersonasList)
  },
  {
    path: 'voluntarios/personas/nuevo',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },
  {
    path: 'voluntarios/personas/editar/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },
  {
    path: 'voluntarios/actividades',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividades-list/actividades-list')
        .then(m => m.ActividadesList)
  },
  {
    path: 'voluntarios/actividades/nueva',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },
  {
    path: 'voluntarios/actividades/editar/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: VOLUNTARIOS_ALLOWED_ROLES },
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },

  // 🔐 DETALLES
  {
    path: 'detalle-penal/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/detalle-penal/detalle-penal')
        .then(m => m.DetallePenalComponent),
  },
  {
    path: 'detalle-civico/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/detalle-civico/detalle-civico')
        .then(m => m.DetalleCivicoComponent),
  },
  {
    path: 'nuevo-expediente-penal',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nuevo-expediente-penal/nuevo-expediente-penal')
        .then(m => m.NuevoExpedientePenalComponent),
  },

  // 🔐 CÍVICO
  {
    path: 'nuevo-expediente-civico',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nuevo-expediente-civico/nuevo-expediente-civico')
        .then(m => m.NuevoExpedienteCivicoComponent),
  },

  // 🔐 PERFILES
  { path: 'psicologa', component: PerfilPsicologa, canActivate: [authGuard] },
  { path: 'guia', component: PerfilGuia, canActivate: [authGuard] },
  { path: 'trabajos', component: PerfilTrabajoS, canActivate: [authGuard] },
  { path: 'admin', component: PerfilAdmin, canActivate: [authGuard] },

  // 🔐 SEGUIMIENTO PENAL
  {
    path: 'penal/ficha-seguimiento/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ficha-seguimiento/ficha-seguimiento')
        .then(m => m.FichaSeguimientoComponent),
  },
  {
    path: 'penal/historial-supervision/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/historial-supervision/historial-supervision')
        .then(m => m.HistorialSupervisionComponent),
  },
  {
    path: 'penal/nota-evolucion/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/nota-evolucion/nota-evolucion')
        .then(m => m.NotaEvolucionComponent),
  },
  {
    path: 'penal/incidencias/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/incidencias-penal/incidencias-penal.component')
        .then(m => m.IncidenciasPenalComponent),
  },

  // 🚨 SIEMPRE AL FINAL
  { path: '**', redirectTo: 'login' }
];
