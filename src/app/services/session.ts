import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  clearSession() {
    localStorage.removeItem('token');
  }

  logout() {
    this.clearSession();
    localStorage.clear();
  }

  getPayload(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // 🔥 NUEVO: OBTENER ID DEL USUARIO DESDE JWT
  getUserId(): number {
    const payload = this.getPayload();

    return (
      payload?.sub ||
      payload?.id ||
      payload?.userId ||
      0
    );
  }

  getUserName(): string {
    const payload = this.getPayload();
    return payload?.nomUsuario || payload?.nom_usuario || 'Usuario';
  }

  getRole(): string {
    const payload = this.getPayload();
    return payload?.rol || 'sin-rol';
  }

  // Helpers de Roles
  esAdmin(): boolean { return this.getRole().toLowerCase() === 'admin'; }
  esGuia(): boolean { return this.getRole().toLowerCase() === 'guia'; }
  esPsicologo(): boolean { return this.getRole().toLowerCase() === 'psicologo'; }
  esTrabajadorSocial(): boolean { return this.getRole().toLowerCase() === 'trabajadorsocial'; }

  isTokenExpired(): boolean {
    const payload = this.getPayload();
    if (!payload?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
}