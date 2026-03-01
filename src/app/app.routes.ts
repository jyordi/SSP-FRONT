import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';

export const routes: Routes = [
  // ... tus rutas existentes ...

  // Redireccionamiento principal
  { path: '', redirectTo: 'voluntarios/personas', pathMatch: 'full' },

   {
        path: 'formu-psico',
        component: FormuPsico
    },

  // VOLUNTARIOS - Personas
  {
    path: 'voluntarios/personas',
    loadComponent: () =>
      import('./voluntarios/pages/personas/personas-list/personas-list')
        .then(m => m.PersonasList)
  },
  {
    path: 'voluntarios/personas/nuevo',
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },
  {
    path: 'voluntarios/personas/editar/:id',
    loadComponent: () =>
      import('./voluntarios/pages/personas/persona-form/persona-form')
        .then(m => m.PersonaForm)
  },

  // VOLUNTARIOS - Actividades
  {
    path: 'voluntarios/actividades',
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividades-list/actividades-list')
        .then(m => m.ActividadesList)
  },
  {
    path: 'voluntarios/actividades/nueva',
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },
  {
    path: 'voluntarios/actividades/editar/:id',
    loadComponent: () =>
      import('./voluntarios/pages/actividades/actividad-form/actividad-form')
        .then(m => m.ActividadForm)
  },

  // Wildcard al final
  { path: '**', redirectTo: 'voluntarios/personas' }
];
