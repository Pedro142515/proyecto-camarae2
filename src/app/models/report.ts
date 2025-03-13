export interface Report {
  id: string;
  equipmentId: string;
  clientName: string;
  description: string;
  imageUrl: string;
  date: Date;
   status: 'Activo' | 'Inactivo';
}
  