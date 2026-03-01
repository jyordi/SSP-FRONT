import { Routes } from '@angular/router';
import { FormuPsico } from './civil/formu-psico/formu-psico';
import { SeguimientoPsi } from './civil/seguimiento-psi/seguimiento-psi';

export const routes: Routes = [
    {
        path: 'formu-psico',
        component: FormuPsico
    },
    {
        path: 'segui-psi',
        component: SeguimientoPsi
    }
];
