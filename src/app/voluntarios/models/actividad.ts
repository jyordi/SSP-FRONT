export interface Actividad {
  id?: string;
  nombreActividad: string;
  impartidor: string;
  responsable: string;
  lugar: string;
  fecha: string;
  numParticipantes: number;
  estado: 'Se llevó a cabo' | 'No se llevó a cabo';
  descripcion: string;
}
