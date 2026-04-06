import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PenalService {
  private BASE = 'http://localhost:3000';
  private API_PENAL        = `${this.BASE}/penal/expedientes`;
  private API_BENEFICIARIO = `${this.BASE}/beneficiarios`;
  private API_VALORACION   = `${this.BASE}/penal/valoracion-psicologica`;
  private API_TRABAJO      = `${this.BASE}/penal/estudio-trabajo-social`;
  private API_PLAN         = `${this.BASE}/penal/plan-trabajo`;
  private API_DOCS         = `${this.BASE}/penal/documentos`;

  constructor(private http: HttpClient) {}

  private _headers(): HttpHeaders {
    const token =
      localStorage.getItem('access_token')   ??
      localStorage.getItem('token')           ??
      sessionStorage.getItem('access_token') ??
      sessionStorage.getItem('token')         ?? '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // ─── BENEFICIARIO ────────────────────────────────────────────
  crearBeneficiario(data: any): Observable<any> {
    return this.http.post(this.API_BENEFICIARIO, data, { headers: this._headers() });
  }
  getBeneficiario(id: number | string): Observable<any> {
    return this.http.get(`${this.API_BENEFICIARIO}/${id}`, { headers: this._headers() });
  }
  obtenerBeneficiarios(): Observable<any> {
    return this.http.get(this.API_BENEFICIARIO, { headers: this._headers() });
  }
  updateBeneficiario(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.API_BENEFICIARIO}/${id}`, data, { headers: this._headers() });
  }

  // ─── EXPEDIENTE ──────────────────────────────────────────────
  crearExpediente(data: any): Observable<any> {
    return this.http.post(this.API_PENAL, data, { headers: this._headers() });
  }

  // ─── VALORACIÓN PSICOLÓGICA ──────────────────────────────────
  saveValoracionPsicologica(data: any): Observable<any> {
    return this.http.post(this.API_VALORACION, data, { headers: this._headers() });
  }
  getValoracionByExpediente(expedienteId: number): Observable<any> {
    return this.http.get(`${this.API_VALORACION}/expediente/${expedienteId}`, { headers: this._headers() });
  }
  updateValoracion(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.API_VALORACION}/${id}`, data, { headers: this._headers() });
  }
  deleteValoracion(id: number): Observable<any> {
    return this.http.delete(`${this.API_VALORACION}/${id}`, { headers: this._headers() });
  }

  // ─── TRABAJO SOCIAL ──────────────────────────────────────────
  saveTrabajoSocial(data: any): Observable<any> {
    return this.http.post(this.API_TRABAJO, data, { headers: this._headers() });
  }
  getTrabajoSocialByExpediente(expedienteId: number): Observable<any> {
    return this.http.get(`${this.API_TRABAJO}/expediente/${expedienteId}`, { headers: this._headers() });
  }
  getTrabajosSociales(): Observable<any> {
    return this.http.get(this.API_TRABAJO, { headers: this._headers() });
  }
  getTrabajoSocialById(id: number): Observable<any> {
    return this.http.get(`${this.API_TRABAJO}/${id}`, { headers: this._headers() });
  }
  updateTrabajoSocial(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.API_TRABAJO}/${id}`, data, { headers: this._headers() });
  }
  deleteTrabajoSocial(id: number): Observable<any> {
    return this.http.delete(`${this.API_TRABAJO}/${id}`, { headers: this._headers() });
  }

  // ─── PLAN DE TRABAJO ─────────────────────────────────────────
  /** POST /penal/plan-trabajo */
  savePlanTrabajo(data: any): Observable<any> {
    return this.http.post(this.API_PLAN, data, { headers: this._headers() });
  }
  /** GET /penal/plan-trabajo/expediente/{expedienteId} */
  getPlanTrabajoByExpediente(expedienteId: number): Observable<any> {
    return this.http.get(`${this.API_PLAN}/expediente/${expedienteId}`, { headers: this._headers() });
  }
  /** GET /penal/plan-trabajo/{id} */
  getPlanTrabajoById(id: number): Observable<any> {
    return this.http.get(`${this.API_PLAN}/${id}`, { headers: this._headers() });
  }
  /** PATCH /penal/plan-trabajo/{id} */
  updatePlanTrabajo(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.API_PLAN}/${id}`, data, { headers: this._headers() });
  }
  /** DELETE /penal/plan-trabajo/{id} */
  deletePlanTrabajo(id: number): Observable<any> {
    return this.http.delete(`${this.API_PLAN}/${id}`, { headers: this._headers() });
  }
  /** GET /penal/documentos/plan-trabajo/{id}/pdf */
  getPlanTrabajoPdf(id: number): Observable<Blob> {
    const headers = this._headers().delete('Content-Type');
    return this.http.get(`${this.API_DOCS}/plan-trabajo/${id}/pdf`, {
      headers,
      responseType: 'blob',
    });
  }
}