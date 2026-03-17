import { Routes } from '@angular/router';


import { LoginComponent } from './auth/login/login';
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';
import { PenalForm } from './components/penal-form/penal-form';
import { ValoracionPenalComponent } from './components/valoracion-penal/valoracion-penal';
import { EstudioTrabajoSocialComponent } from './components/estudio-trabajo-social/estudio-trabajo-social.component';


export const routes: Routes = [
    
    { path: '', redirectTo: 'login', pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent},
  { path: 'seleccion', component: SeleccionComponent },
  { path: 'expedientes', component: ListadoExpedientesComponent },
  { path: 'nuevo-usuario-penal',component: PenalForm},
  {path: "vp", component: ValoracionPenalComponent},
  { path: 'valoracion-psicologica', component: ValoracionPenalComponent },
  {
    path: 'trabajo-social',
    loadComponent: () =>
      import('./components/estudio-trabajo-social/estudio-trabajo-social.component').then(
        m => m.EstudioTrabajoSocialComponent
      ),
    title: 'Estudio de Trabajo Social — Reconecta con la Paz',
  }
    
];
