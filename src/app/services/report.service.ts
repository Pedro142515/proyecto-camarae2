// report.service.ts corregido
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Report } from '../models/report';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private reports: Report[] = [];
  private reportsSubject = new BehaviorSubject<Report[]>([]);
  private readonly STORAGE_KEY = 'maintenanceReports';

  constructor() {
    // Load reports from localStorage on initialization
    this.loadReports();
  }

  // En report.service.ts, en el método loadReports
  private loadReports(): void {
    try {
      const savedReports = localStorage.getItem(this.STORAGE_KEY);
      if (savedReports) {
        this.reports = JSON.parse(savedReports);
        // Asegurar que las fechas se conviertan correctamente
        this.reports.forEach(report => {
          if (typeof report.date === 'string') {
            report.date = new Date(report.date);
          }
        });
        this.reportsSubject.next([...this.reports]);
      }
    } catch (error) {
      console.error('Error al cargar reportes desde localStorage:', error);
      this.reports = [];
      this.reportsSubject.next([]);
    }
  }

  private saveReports(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.reports));
        this.reportsSubject.next([...this.reports]);
        resolve();
      } catch (error) {
        console.error('Error saving reports to localStorage:', error);
        reject(error);
      }
    });
  }

  getReports(): Observable<Report[]> {
    return this.reportsSubject.asObservable();
  }

  async addReport(report: Report): Promise<void> {
    // Generar ID único
    report.id = this.generateId();
    // Asegurar que date sea un objeto Date
    report.date = new Date();
    // Estado por defecto
    report.status = 'Activo';
    
    // Añadir al principio para tener el más reciente primero
    this.reports.unshift(report);
    return this.saveReports();
  }

  // En report.service.ts
async updateReport(updatedReport: Report): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const index = this.reports.findIndex(r => r.id === updatedReport.id);
      if (index !== -1) {
        // Crear copia profunda para evitar referencias mutables
        this.reports[index] = JSON.parse(JSON.stringify(updatedReport));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.reports));
        this.reportsSubject.next([...this.reports]);
        resolve();
      } else {
        reject(new Error('Reporte no encontrado'));
      }
    } catch (error) {
      console.error('Error al actualizar reporte:', error);
      reject(error);
    }
  });
}

  async deleteReport(id: string): Promise<void> {
    const initialLength = this.reports.length;
    this.reports = this.reports.filter(report => report.id !== id);
    // Verify if the report was actually removed
    if (this.reports.length === initialLength) {
      throw new Error('Report not found');
    }
    return this.saveReports();
  }

  getReportById(id: string): Promise<Report | undefined> {
    return new Promise((resolve) => {
      const report = this.reports.find(report => report.id === id);
      resolve(report ? {...report} : undefined);
    });
  }

  private generateId(): string {
    // More unique ID using timestamp + random number
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}