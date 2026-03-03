import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';
import { SelePerfil } from './civil/sele-perfil/sele-perfil';

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
    }
];
