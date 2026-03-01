import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Persona } from '../models/persona';

@Injectable({ providedIn: 'root' })
export class PersonaService {
  private apiUrl = 'http://localhost:3000/voluntarios/personas';
  private _personas = signal<Persona[]>([]);

  readonly personas = this._personas.asReadonly();

  constructor(private http: HttpClient) {
    this.loadAll();
  }

  private loadAll(): void {
    this.http.get<Persona[]>(this.apiUrl).subscribe({
      next: (data) => this._personas.set(data),
      error: (err) => console.error('Error cargando personas:', err)
    });
  }

  getById(id: string): Persona | undefined {
    return this._personas().find(p => p.id === id);
  }

  create(persona: Omit<Persona, 'id'>): Observable<Persona> {
    return this.http.post<Persona>(this.apiUrl, persona).pipe(
      tap(newPersona => {
        this._personas.set([...this._personas(), newPersona]);
      })
    );
  }

  update(id: string, cambios: Partial<Persona>): Observable<Persona> {
    return this.http.put<Persona>(`${this.apiUrl}/${id}`, cambios).pipe(
      tap(updatedPersona => {
        const updated = this._personas().map(p =>
          p.id === id ? updatedPersona : p
        );
        this._personas.set(updated);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._personas.set(this._personas().filter(p => p.id !== id));
      })
    );
  }

  refresh(): void {
    this.loadAll();
  }
}
