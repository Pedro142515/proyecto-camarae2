// app.routes.ts
import { Routes } from '@angular/router';
import { CreateReportsComponent } from './Components/create-reports/create-reports.component';
import { ReportListComponent } from './Components/report-list/report-list.component';
import { ReportDetailComponent } from './Components/report-detail/report-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'reportes', pathMatch: 'full' },
  { path: 'nuevo-reporte', component: CreateReportsComponent },
  { path: 'reportes', component: ReportListComponent },
  { path: 'reporte/:id', component: ReportDetailComponent },
  { path: '**', redirectTo: 'reportes' } // Ruta para manejar URLs no existentes
];