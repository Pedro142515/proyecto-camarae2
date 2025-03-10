import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CameraComponent } from './Components/camera/camera.component';
import { CameraService } from './services/camera.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, IonicModule, CameraComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'proyectoCameraE2';

  constructor(private cameraService: CameraService) {}

  async ngOnInit() {
    // Verificar permisos al iniciar la aplicación
    await this.cameraService.checkAndRequestPermissions();
  }
}