import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Actividad } from '../models/actividad';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private apiUrl = 'http://localhost:3000/voluntarios/actividades';
  private _actividades = signal<Actividad[]>([]);

  readonly actividades = this._actividades.asReadonly();

  constructor(private http: HttpClient) {
    this.loadAll();
  }

  private loadAll(): void {
    this.http.get<Actividad[]>(this.apiUrl).subscribe({
      next: (data) => this._actividades.set(data),
      error: (err) => console.error('Error cargando actividades:', err)
    });
  }

  getById(id: string): Actividad | undefined {
    return this._actividades().find(a => a.id === id);
  }

  create(actividad: Omit<Actividad, 'id'>): Observable<Actividad> {
    return this.http.post<Actividad>(this.apiUrl, actividad).pipe(
      tap(newActividad => {
        this._actividades.set([...this._actividades(), newActividad]);
      })
    );
  }

  update(id: string, cambios: Partial<Actividad>): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.apiUrl}/${id}`, cambios).pipe(
      tap(updatedActividad => {
        const updated = this._actividades().map(a =>
          a.id === id ? updatedActividad : a
        );
        this._actividades.set(updated);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._actividades.set(this._actividades().filter(a => a.id !== id));
      })
    );
  }

  refresh(): void {
    this.loadAll();
  }
}
