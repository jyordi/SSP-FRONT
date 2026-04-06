
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

  getPayload(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // 🔥 USUARIO
  getUserName(): string {
    const payload = this.getPayload();
    return payload?.nomUsuario || payload?.username || 'Usuario';
  }

  // 🔥 ROLES (simulado si no viene del backend)
  getRole(): string {
    const payload = this.getPayload();

    // si backend no manda rol → asignamos por usuario
    if (payload?.nomUsuario === 'admin') return 'admin';

    return 'psicologo';
  }

  // 🔥 EXPIRACIÓN
  isTokenExpired(): boolean {
    const payload = this.getPayload();
    if (!payload?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
}

