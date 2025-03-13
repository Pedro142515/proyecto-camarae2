import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportService } from '../../services/report.service';
import { Report } from '../../models/report';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-create-reports',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-reports.component.html',
  styleUrl: './create-reports.component.css'
})
export class CreateReportsComponent implements OnInit {
  reportForm!: FormGroup;
  imagePreview: string | null = null;
  isSubmitting = false;
  permissionsGranted = false;
  imageFile: string = '';

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkPermissions();
  }

  private initForm(): void {
    this.reportForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(3)]],
      equipmentId: ['', [Validators.required, Validators.pattern('^EQ-\\d{4}-\\d{3}$')]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private async checkPermissions(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        // En Android 13+ se requiere un enfoque diferente para los permisos
        const permissions = await Camera.checkPermissions();
        
        if (permissions.camera !== 'granted') {
          // Solicitar específicamente permisos de cámara
          try {
            const result = await Camera.requestPermissions({
              permissions: ['camera']
            });
            this.permissionsGranted = result.camera === 'granted';
            
            if (!this.permissionsGranted) {
              console.log('Usuario denegó permisos de cámara');
            }
          } catch (permError) {
            console.error('Error al solicitar permisos:', permError);
            this.permissionsGranted = false;
          }
        } else {
          this.permissionsGranted = true;
        }
      } catch (error) {
        console.error('Error al verificar permisos:', error);
        // Intentar solicitar permisos de todos modos como fallback
        try {
          const result = await Camera.requestPermissions();
          this.permissionsGranted = result.camera === 'granted';
        } catch {
          this.permissionsGranted = false;
        }
      }
    } else {
      // En plataforma web
      this.permissionsGranted = true;
    }
  }

  async takePicture(): Promise<void> {
    try {
      if (!this.permissionsGranted && Capacitor.isNativePlatform()) {
        await this.checkPermissions();
        if (!this.permissionsGranted) {
          alert('Para tomar fotos, necesitas otorgar permisos de cámara');
          return;
        }
      }
  
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
  
      if (image.base64String) {
        this.imageFile = `data:image/jpeg;base64,${image.base64String}`;
        this.imagePreview = this.imageFile;
        // Marcamos el formulario como modificado para validaciones
        this.reportForm.markAsDirty();
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
      }
    }
  }

  private async captureWithWebAPI(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Cámara no soportada en este dispositivo');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.imageFile = canvas.toDataURL('image/jpeg');
        this.imagePreview = this.imageFile;
        
        // Stop camera
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos.');
    }
  }

  onFileChange(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      // Verify file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imageFile = reader.result as string;
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveReport(): Promise<void> {
    if (this.reportForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.reportForm.controls).forEach(key => {
        const control = this.reportForm.get(key);
        control?.markAsTouched();
      });
      alert('Por favor completa todos los campos correctamente');
      return;
    }
    
    if (!this.imageFile) {
      alert('Por favor toma o selecciona una foto del equipo');
      return;
    }
    
    this.isSubmitting = true;
    try {
      const formValues = this.reportForm.value;

      const newReport: Report = {
        id: '',
        equipmentId: formValues.equipmentId,
        clientName: formValues.clientName,
        description: formValues.description,
        imageUrl: this.imageFile,
        date: new Date(),
        status: 'Activo'
      };
      
      await this.reportService.addReport(newReport);
      alert('Reporte guardado exitosamente');
      
      // Navigate after alert
      this.router.navigate(['/reportes']);
    } catch (error) {
      console.error('Error al guardar el reporte:', error);
      alert('Error al guardar el reporte. Intente nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }

  // Validation helper method
  hasError(controlName: string, errorType: string): boolean {
    const control = this.reportForm.get(controlName);
    return !!control && control.touched && control.hasError(errorType);
  }

  cancelAndReturn(): void {
    this.router.navigate(['/reportes']);
  }
}