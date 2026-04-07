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
  // 🔥 TRAER TODOS LOS PLANES
// ✅ GET /penal/plan-trabajo/{id}

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
 

    
  


  getPlanTrabajoByExpediente(expedienteId: number) {
  return this.http.get(`${this.API_PLAN}/expediente/${expedienteId}`, {
    headers: this._headers()
  });
}

getPlanTrabajoPdf(id: number): Observable<Blob> {
  const headers = this._headers().delete('Content-Type');

  return this.http.get(`${this.API_DOCS}/plan-trabajo/${id}/pdf`, {
    headers,
    responseType: 'blob'
  });
}

  // 🔥 GUARDAR DETALLE
savePlanDetalle(data: any) {
  return this.http.post(`${this.BASE}/penal/plan-trabajo-detalle`, data, {
    headers: this._headers()
  });
}

// 🔥 OBTENER DETALLE POR PLAN
getPlanDetalle(planId: number) {
  return this.http.get(
    `${this.BASE}/penal/plan-trabajo-detalle/plan/${planId}`,
    { headers: this._headers() }
  );
}



// 🔥 OBTENER TODAS LAS ACTIVIDADES
getActividades() {
  return this.http.get(`${this.BASE}/actividades/todas`, {
    headers: this._headers()
  });
}

// 🔥 CREAR ACTIVIDAD
crearActividad(data: any) {
  return this.http.post(`${this.BASE}/actividades`, data, {
    headers: this._headers()
  });
}

// 🔥 ACTUALIZAR ACTIVIDAD
updateActividad(id: number, data: any) {
  return this.http.patch(`${this.BASE}/actividades/${id}`, data, {
    headers: this._headers()
  });
}

// 🔥 ELIMINAR ACTIVIDAD
deleteActividad(id: number) {
  return this.http.delete(`${this.BASE}/actividades/${id}`, {
    headers: this._headers()
  });
}


// 🔥 ACTUALIZAR DETALLE DEL PLAN (Cambio de estatus, avances, observaciones)
  updatePlanDetalle(id: number, data: any): Observable<any> {
    return this.http.patch(
      `${this.BASE}/penal/plan-trabajo-detalle/${id}`, 
      data, 
      { headers: this._headers() }
    );
  }

  // 🔥 ELIMINAR DETALLE DEL PLAN (Por si asignaste una actividad por error)
  deletePlanDetalle(id: number): Observable<any> {
    return this.http.delete(
      `${this.BASE}/penal/plan-trabajo-detalle/${id}`, 
      { headers: this._headers() }
    );
  }


  // ─── USUARIOS / GUÍAS ────────────────────────────────────────
  // 🔥 NUEVO MÉTODO PARA OBTENER A LOS GUÍAS
  getGuias(): Observable<any> {
    // ⚠️ ATENCIÓN: Cambia '/usuarios/guias' por el endpoint real de tu backend
    // Por ejemplo, podría ser '/users?rol=GUIA' o '/auth/guias'
    return this.http.get(`${this.BASE}/usuarios/guias`, { 
      headers: this._headers() 
    });
  }


  // ─── CARÁTULA DE EXPEDIENTE ──────────────────────────
  saveCaratula(data: any): Observable<any> {
    return this.http.post(`${this.BASE}/penal/expediente-caratula`, data, { headers: this._headers() });
  }
  getCaratulaByExpediente(expedienteId: number): Observable<any> {
    return this.http.get(`${this.BASE}/penal/expediente-caratula/expediente/${expedienteId}`, { headers: this._headers() });
  }
  updateCaratula(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.BASE}/penal/expediente-caratula/${id}`, data, { headers: this._headers() });
  }
  getCaratulaPdf(id: number): Observable<Blob> {
    const headers = this._headers().delete('Content-Type');
    // 👇 Endpoint solicitado
    return this.http.get(`${this.BASE}/penal/documentos/caratula/${id}/pdf`, { 
      headers, 
      responseType: 'blob' 
    });
  }
}