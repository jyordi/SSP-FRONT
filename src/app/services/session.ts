import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {

  getToken(): string | null {
    return (
      localStorage.getItem('token') ??
      localStorage.getItem('access_token') ??
      sessionStorage.getItem('token') ??
      sessionStorage.getItem('access_token')
    );
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
  }

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('access_token');
  }

  logout() {
    this.clearSession();
    localStorage.clear();
    sessionStorage.clear();
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

  private getNormalizedRole(): string {
    return this.getRole().toLowerCase();
  }

  hasRole(role: string): boolean {
    return this.getNormalizedRole() === role.toLowerCase();
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  // Helpers de Roles
  esAdmin(): boolean { return this.hasRole('admin'); }
  esGuia(): boolean { return this.hasRole('guia'); }
  esPsicologo(): boolean { return this.hasRole('psicologo'); }
  esTallerista(): boolean { return this.hasRole('tallerista'); }
  esCoordinador(): boolean { return this.hasRole('coordinador'); }
  esTrabajadorSocial(): boolean { return this.hasRole('trabajo_social'); }
  puedeAccederVoluntarios(): boolean {
    return this.hasAnyRole(['admin', 'coordinador', 'tallerista']);
  }

  isTokenExpired(): boolean {
    const payload = this.getPayload();
    if (!payload?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
}
