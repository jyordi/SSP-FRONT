
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExpedientesService {

  private API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // PENAL
  getPenal(): Observable<any> {
    return this.http.get(`${this.API_URL}/penal/expedientes`);
  }

  // CIVICO (ajusta si cambia endpoint)
  getCivico(): Observable<any> {
    return this.http.get(`${this.API_URL}/civico/expedientes`);
  }

  crearCivico(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/civico/expedientes`, data);
  }

  // VOLUNTARIO (ajusta si cambia endpoint)
  getVoluntario(): Observable<any> {
    return this.http.get(`${this.API_URL}/voluntario/expedientes`);
  }
}

