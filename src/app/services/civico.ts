import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class Civico {
 
  private BASE = 'http://localhost:3000';

  private API_BENEFICIARIO = `${this.BASE}/beneficiarios`;
  private API_CIVICO = `${this.BASE}/civico/expedientes`;

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

  //  CREAR BENEFICIARIO
  crearBeneficiario(data: any): Observable<any> {
    console.log('DATA BENEFICIARIO:', data);
    return this.http.post(this.API_BENEFICIARIO, data, {
      headers: this._headers(),
    });
  }

  // CREAR EXPEDIENTE CÍVICO
  crearCivico(data: any): Observable<any> {
    console.log('DATA CIVICO:', data);
    return this.http.post(this.API_CIVICO, data, {
      headers: this._headers(),
    });
  }
}