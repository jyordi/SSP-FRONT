import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  id?: number;
  nombre: string;
  rol: 'admin' | 'psicologo' | 'trabajo_social' | 'guia';
  nomUsuario: string;
  contrasena?: string;
  estatus?: boolean;
  creadoEn?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private API = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  crearUsuario(data: Usuario): Observable<any> {
    return this.http.post(this.API, data);
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.API);
  }
}