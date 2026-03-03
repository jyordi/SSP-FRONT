import { Routes } from '@angular/router';


import { LoginComponent } from './auth/login/login';
import { SeleccionComponent } from './dashboard/seleccion/seleccion';
import { ListadoExpedientesComponent } from './dashboard/listado-expedientes/listado-expedientes';


export const routes: Routes = [
    
    { path: '', redirectTo: 'login', pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent},
  { path: 'seleccion', component: SeleccionComponent },
  { path: 'expedientes', component: ListadoExpedientesComponent }
    
];
