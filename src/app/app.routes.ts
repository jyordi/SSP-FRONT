import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { SelePerfil } from './civil/sele-perfil/sele-perfil';
import { PerfilPsicologa } from './civil/perfil-psicologa/perfil-psicologa';
import { PerfilGuia } from './civil/perfil-guia/perfil-guia';
import { PerfilTrabajoS } from './civil/perfil-trabajo-s/perfil-trabajo-s';

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
        path:'perfil',
        component: SelePerfil
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
        path:'**',
        redirectTo:'perfil'
    }

];
