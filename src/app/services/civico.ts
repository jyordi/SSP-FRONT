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

  //Crear nota de evolución psicológica
  crearnota(data: any): Observable<any> {
    console.log('DATA NOTA DE EVOLUCIÓN:', data);
    return this.http.post(`${this.BASE}/civico/f5`, data, {
      headers: this._headers(),
    });
  }

   // Ejemplo para listar todas las sesiones de un expediente
  listarSesiones(expedienteId: string): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f5/expediente/${expedienteId}`, {
      headers: this._headers(),
    });
  }

  // ================= Contar total de sesiones =================
  contarSesiones(expedienteId: string): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f5/expediente/${expedienteId}/total`, {
      headers: this._headers(),
    });
  }

  // ================= Obtener sesión específica por número =================
  obtenerSesion(expedienteId: string, num: number): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f5/expediente/${expedienteId}/sesion/${num}`, {
      headers: this._headers(),
    });
  }

  // ================= Actualizar sesión por UUID =================
  actualizarSesion(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.BASE}/civico/f5/${id}`, data, {
      headers: this._headers(),
    });
  }

  // ================= Obtener sesión por UUID =================
  obtenerPorId(id: string): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f5/${id}`, {
      headers: this._headers(),
    });
  }


  getResumenCivico(id: number) {
  return this.http.get(`${this.BASE}/civico/expedientes/${id}`);
}

updateCivico(id: number, data: any) {
  return this.http.patch(`${this.BASE}/civico/expedientes/${id}`, data);
}
}