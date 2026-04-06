import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Civico {
  
  private api = 'http://localhost:3000'; // 🔥 CORREGIDO

  constructor(private http: HttpClient) {}

  // 🔥 CREAR BENEFICIARIO
  crearBeneficiario(data: any) {
    return this.http.post<any>(`${this.api}/beneficiarios`, data);
  }

  // 🔥 CREAR EXPEDIENTE
  crearCivico(data: any, token: string) {

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<any>(
      `${this.api}/expedientes/civico`,
      data,
      { headers }
    );
  }
}