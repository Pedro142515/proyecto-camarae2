import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReportService } from '../../services/report.service';
import { Report } from '../../models/report';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-report-list',
  imports: [CommonModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.css'
})
export class ReportListComponent implements OnInit, OnDestroy {
  reports: Report[] = [];
  filteredReports: Report[] = [];
  isLoading = true;
  noReports = false;
  filterStatus: 'all' | 'active' | 'inactive' = 'all';
  private reportsSub!: Subscription;

  constructor(
    private reportService: ReportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.reportsSub = this.reportService.getReports().subscribe(reports => {
      this.reports = reports;
      this.applyFilters();
      this.isLoading = false;
      this.noReports = this.reports.length === 0;
    });
  }

  ngOnDestroy(): void {
    if (this.reportsSub) {
      this.reportsSub.unsubscribe();
    }
  }

  applyFilters(): void {
    if (this.filterStatus === 'all') {
      this.filteredReports = [...this.reports];
    } else {
      const statusFilter = this.filterStatus === 'active' ? 'Activo' : 'Inactivo';
      this.filteredReports = this.reports.filter(report => report.status === statusFilter);
    }
    
    // Ordenar por fecha, más reciente primero
    this.filteredReports.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  setFilter(status: 'all' | 'active' | 'inactive'): void {
    this.filterStatus = status;
    this.applyFilters();
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  viewDetails(id: string): void {
    this.router.navigate(['/reporte', id]);
  }

  toggleReportStatus(report: Report, event: Event): void {
    event.stopPropagation();
    
    // Cambiar el estado solo localmente
    const newStatus = report.status === 'Activo' ? 'Inactivo' : 'Activo';
    
    // Actualizar localmente el estado del reporte en el array
    const index = this.reports.findIndex(r => r.id === report.id);
    if (index !== -1) {
      // Crea una nueva referencia para activar la detección de cambios
      // Hacemos un cast explícito para que TypeScript sepa que newStatus es del tipo correcto
      const updatedReport = {
        ...report, 
        status: newStatus as 'Activo' | 'Inactivo'
      };
      
      this.reports[index] = updatedReport;
      
      // Actualiza también en filteredReports
      const filteredIndex = this.filteredReports.findIndex(r => r.id === report.id);
      if (filteredIndex !== -1) {
        this.filteredReports[filteredIndex] = updatedReport;
      }
      
      alert(`El reporte ha sido marcado como ${newStatus}`);
    }
  }

  deleteReport(id: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('¿Está seguro que desea eliminar este reporte? Esta acción no se puede deshacer.')) {
      this.reportService.deleteReport(id)
        .then(() => {
          // Notificación visual
          alert('Reporte eliminado correctamente');
        })
        .catch(error => {
          console.error('Error al eliminar el reporte:', error);
          alert('Error al eliminar el reporte');
        });
    }
  }

  createNewReport(): void {
    this.router.navigate(['/nuevo-reporte']);
  }
}