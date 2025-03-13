import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportService } from '../../services/report.service';
import { Report } from '../../models/report';

@Component({
  selector: 'app-report-detail',
  imports: [CommonModule],
  templateUrl: './report-detail.component.html',
  styleUrl: './report-detail.component.css'
})
export class ReportDetailComponent implements OnInit {
  report: Report | undefined;
  reportId: string = '';
  isLoading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {
    this.reportId = this.route.snapshot.paramMap.get('id') || '';
    if (this.reportId) {
      this.loadReport();
    } else {
      this.notFound = true;
      this.isLoading = false;
    }
  }

  private loadReport(): void {
    this.reportService.getReportById(this.reportId)
      .then(report => {
        this.report = report;
        this.isLoading = false;

        if (!this.report) {
          this.notFound = true;
        }
      })
      .catch(error => {
        console.error('Error al cargar el reporte:', error);
        this.isLoading = false;
        this.notFound = true;
      });
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

  goBack(): void {
    this.router.navigate(['/reportes']);
  }

  toggleStatus(): void {
    if (!this.report) return;
    
    // Crear copia profunda del objeto
    const reportCopy = JSON.parse(JSON.stringify(this.report));
    const newStatus = reportCopy.status === 'Activo' ? 'Inactivo' : 'Activo';
    reportCopy.status = newStatus;
    
    this.reportService.updateReport(reportCopy)
      .then(() => {
        // Asignar explícitamente una nueva referencia al objeto
        this.report = {...reportCopy};
        alert(`Reporte marcado como ${newStatus}`);
      })
      .catch(error => {
        console.error('Error al actualizar el estado:', error);
        alert('Error al actualizar el estado del reporte');
      });
  }

  deleteReport(): void {
    if (confirm('¿Está seguro que desea eliminar este reporte? Esta acción no se puede deshacer.')) {
      this.reportService.deleteReport(this.reportId)
        .then(() => {
          alert('Reporte eliminado correctamente');
          this.router.navigate(['/reportes']);
        })
        .catch(error => {
          console.error('Error al eliminar el reporte:', error);
          alert('Error al eliminar el reporte');
        });
    }
  }
}