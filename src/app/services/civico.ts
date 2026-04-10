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
  private API_F1 = `${this.BASE}/civico`;

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
  //  civico.service.ts


  // ================= Obtener sesión por UUID =================
  obtenerPorId(id: string): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f5/${id}`, {
      headers: this._headers(),
    });
  }


// ***** SECCIÓN DE ENTREVISTA PSICOLOGICA 
//crearla 
  crearF1(data: any): Observable<any> {
  return this.http.post(`${this.BASE}/civico/f1`, data, { 
    headers: this._headers(),
   });
}

// Obtener F1 por expediente
obtenerF1PorExpediente(expedienteId: string) {
  return this.http.get(`${this.BASE}/civico/f1/expediente/${expedienteId}`, {
    headers: this._headers(),
  });
}

//ACTUALIZAR
actualizarF1(idF1: string, data: any): Observable<any> {
    console.log(`ACTUALIZANDO F1 con ID: ${idF1}`, data);
    return this.http.patch(`${this.BASE}/civico/f1/${idF1}`, data, {
      headers: this._headers(),
    });
  }

// ***** SECCIÓN DE ESTUDIO TRABAJO SOCIAL (F2) 
crearF2(data: any): Observable<any> {
  return this.http.post(`${this.BASE}/civico/f2`, data, { 
    headers: this._headers(),
  });
}

obtenerF2PorExpediente(expedienteId: string) {
  return this.http.get(`${this.BASE}/civico/f2/expediente/${expedienteId}`, {
    headers: this._headers(),
  });
}

actualizarF2(idF2: string, data: any): Observable<any> {
  return this.http.patch(`${this.BASE}/civico/f2/${idF2}`, data, {
    headers: this._headers(),
  });
}

// ***** SECCIÓN DE PLAN DE TRABAJO (F3) *****
crearF3(data: any): Observable<any> {
  return this.http.post(`${this.BASE}/civico/f3`, data, { 
    headers: this._headers(),
  });
}

obtenerF3PorExpediente(expedienteId: string) {
  return this.http.get(`${this.BASE}/civico/f3/expediente/${expedienteId}`, {
    headers: this._headers(),
  });
}

verificarCandadoF3(expedienteId: string): Observable<any> {
  return this.http.get(`${this.BASE}/civico/f2/expediente/${expedienteId}/candado-f3`, {
    headers: this._headers(),
  });
}

actualizarF3(idF3: string, data: any): Observable<any> {
  return this.http.patch(`${this.BASE}/civico/f3/${idF3}`, data, {
    headers: this._headers(),
  });
}

// ***** SECCIÓN DE PERFIL DE GUÍAS (Bitácoras, Incidencias y Asignados) *****
obtenerAsignadosGuia(guiaId: number): Observable<any> {
  return this.http.get(`${this.BASE}/civico/expedientes/guia/${guiaId}`, {
    headers: this._headers(),
  });
}   

registrarBitacora(data: any): Observable<any> {
  return this.http.post(`${this.BASE}/civico/bitacora`, data, {
    headers: this._headers(),
  });
}

obtenerBitacoraPorExpediente(expedienteId: string): Observable<any> {
  return this.http.get(`${this.BASE}/civico/bitacora/expediente/${expedienteId}`, {
    headers: this._headers(),
  });
}

eliminarRegistroBitacora(id: number): Observable<any> {
  return this.http.delete(`${this.BASE}/civico/bitacora/${id}`, {
    headers: this._headers(),
  });
}

obtenerResumenHorasBitacora(expedienteId: string): Observable<any> {
  return this.http.get(`${this.BASE}/civico/bitacora/expediente/${expedienteId}/horas`, {
    headers: this._headers(),
  });
}

registrarIncidencia(data: any): Observable<any> {
  return this.http.post(`${this.BASE}/civico/incidencias`, data, {
    headers: this._headers(),
  });
}

obtenerIncidenciasPorExpediente(expedienteId: string): Observable<any> {
  return this.http.get(`${this.BASE}/civico/incidencias/expediente/${expedienteId}`, {
    headers: this._headers(),
  });
}




  getResumenCivico(id: number) {
    return this.http.get(`${this.BASE}/civico/expedientes/${id}`, {
      headers: this._headers(),
    });
  }

  updateCivico(id: number, data: any) {
    return this.http.patch(`${this.BASE}/civico/expedientes/${id}`, data, {
      headers: this._headers(),
    });
  }

  // ================= DOCUMENTOS Y ASISTENCIAS COMBINADO =================
  
  // Generar PDF desde GET (Plantillas o Documentos Fijos)
  generarDocumentoPDF(tipo: string, expedienteId: string): Observable<Blob> {
    return this.http.get(`${this.BASE}/civico/documentos/${tipo}/${expedienteId}`, {
      headers: this._headers(),
      responseType: 'blob'
    });
  }

  // Generar PDF desde POST (Registrar datos + Generar PDF)
  generarDocumentoPDFPost(tipo: string, data: any): Observable<Blob> {
    return this.http.post(`${this.BASE}/civico/documentos/${tipo}`, data, {
      headers: this._headers(),
      responseType: 'blob'
    });
  }

  // Obtener historial de documentos generados
  obtenerHistorialDocumentos(expedienteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/civico/documentos/historial/${expedienteId}`, {
      headers: this._headers(),
    });
  }

  // Subir documento escaneado (Multipart/FormData)
  subirDocumentoEscaneado(data: FormData): Observable<any> {
    const token =
      localStorage.getItem('access_token') ??
      localStorage.getItem('token') ??
      '';

    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    return this.http.post(`${this.BASE}/civico/documentos/subir-escaneado`, data, {
      headers: headers
    });
  }

  registrarAsistenciaYGenerarPDF(data: any): Observable<Blob> {
    return this.generarDocumentoPDFPost('lista-asistencia', data);
  }


  // ================= OBTENER EXPEDIENTE =================
  getExpedienteCivico(idUUID: string): Observable<any> {
    return this.http.get(`${this.API_CIVICO}/${idUUID}`, {
      headers: this._headers(),
    });
  }

  // ================= ACTUALIZAR EXPEDIENTE CÍVICO (UUID) =================
  actualizarExpedienteCivico(idUUID: string, data: any): Observable<any> {
    return this.http.patch(`${this.API_CIVICO}/${idUUID}`, data, {
      headers: this._headers(),
    });
  }

  // ================= OBTENER BENEFICIARIO =================
  obtenerBeneficiario(id: number): Observable<any> {
    return this.http.get(`${this.API_BENEFICIARIO}/${id}`, {
      headers: this._headers(),
    });
  }

  // ================= F4 — CÉDULA INICIAL (Ficha Técnica) =================

  // Crear F4 (solo Admin — relación 1:1 con expediente)
  crearF4(data: any): Observable<any> {
    return this.http.post(`${this.BASE}/civico/f4`, data, {
      headers: this._headers(),
    });
  }

  // Obtener F4 por expediente (todos los roles)
  obtenerF4PorExpediente(expedienteId: string): Observable<any> {
    return this.http.get(`${this.BASE}/civico/f4/expediente/${expedienteId}`, {
      headers: this._headers(),
    });
  }

  // Actualizar F4 por UUID (solo Admin)
  actualizarF4(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.BASE}/civico/f4/${id}`, data, {
      headers: this._headers(),
    });
  }

  // Cambiar estatus de F4 (solo Admin)
  cambiarEstatusF4(id: string, estatusF4: string): Observable<any> {
    return this.http.patch(`${this.BASE}/civico/f4/${id}/estatus`, { estatusF4 }, {
      headers: this._headers(),
    });
  }
}