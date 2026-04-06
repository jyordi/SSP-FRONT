import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PenalService {

  private BASE = 'http://localhost:3000';

  private API_PENAL = `${this.BASE}/penal/expedientes`;
  private API_BENEFICIARIO = `${this.BASE}/beneficiarios`;

  // 🔥 CORREGIDO (QUITAR /penal)
  private API_VALORACION = `${this.BASE}/penal/valoracion-psicologica`;

  constructor(private http: HttpClient) {}

  private _headers(): HttpHeaders {
    const token =
      localStorage.getItem('access_token') ??
      localStorage.getItem('token') ??
      sessionStorage.getItem('access_token') ??
      sessionStorage.getItem('token') ??
      '';

    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  crearBeneficiario(data: any): Observable<any> {
    return this.http.post(this.API_BENEFICIARIO, data, { headers: this._headers() });
  }

  getBeneficiario(id: number | string): Observable<any> {
    return this.http.get(`${this.API_BENEFICIARIO}/${id}`, { headers: this._headers() });
  }

  crearExpediente(data: any): Observable<any> {
    return this.http.post(this.API_PENAL, data, { headers: this._headers() });
  }

  obtenerBeneficiarios(): Observable<any> {
    return this.http.get(this.API_BENEFICIARIO, { headers: this._headers() });
  }

  // 🔥 POST VALORACIÓN
  saveValoracionPsicologica(data: any): Observable<any> {
    return this.http.post(this.API_VALORACION, data, { headers: this._headers() });
  }
}