import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CsvUploadResponse {
  mensaje: string;
  total: number;
  creados: number;
  actualizados: number;
  fallidos: number;
  errores: { fila: number; mensaje: string }[];
}

@Injectable({ providedIn: 'root' })
export class PersonasCsvService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/voluntarios/personas/csv';

  descargarTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, { responseType: 'blob' });
  }

  uploadCsv(file: File): Observable<CsvUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CsvUploadResponse>(`${this.apiUrl}/upload`, formData);
  }
}
