import { Injectable } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private gallery: string[] = [];

  constructor(
    private platform: Platform,
    private alertController: AlertController
  ) {
    this.loadGallery();
  }

  async checkAndRequestPermissions(): Promise<boolean> {
    try {
      // Different approach for web and mobile platforms
      if (Capacitor.isNativePlatform()) {
        // Verificar permisos actuales
        const permissionStatus = await Camera.checkPermissions();
        
        // Si no tenemos permisos, solicitarlos explícitamente
        if (permissionStatus.camera !== 'granted') {
          console.log('Solicitando permisos de cámara...');
          const requestResult = await Camera.requestPermissions();
          
          if (requestResult.camera !== 'granted') {
            console.error('Permiso de cámara denegado por el usuario');
            await this.showPermissionAlert();
            return false;
          }
        }
        
        // Para Android 10+ verificar permisos de almacenamiento
        if (Capacitor.getPlatform() === 'android') {
          try {
            await Filesystem.requestPermissions();
          } catch (error) {
            console.error('Error al solicitar permisos de almacenamiento:', error);
            await this.showStoragePermissionAlert();
          }
        }
        
        return true;
      } else {
        // Para web, usamos la API de permisos del navegador
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            return true;
          } catch (error) {
            console.error('Web camera permission denied', error);
            await this.showPermissionAlert();
            return false;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      await this.showPermissionAlert();
      return false;
    }
  }

  async takePicture(): Promise<string | null> {
    try {
      // Verificar permisos antes de tomar la foto
      const hasPermission = await this.checkAndRequestPermissions();
      if (!hasPermission) {
        throw new Error('Permisos de cámara denegados');
      }

      // Tomar la foto
      let photo: Photo;
      if (Capacitor.isNativePlatform()) {
        photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });
      } else {
        photo = await this.takePictureWeb();
      }

      if (!photo || !photo.webPath) {
        throw new Error('No se obtuvo una imagen válida');
      }

      // Generar un nombre de archivo único
      const fileName = new Date().getTime() + '.jpeg';
      
      // Convertir la imagen a base64
      const base64Data = await this.readAsBase64(photo);
      
      // Guardar la imagen en el sistema de archivos
      let savedFile;
      if (Capacitor.isNativePlatform()) {
        // Para dispositivos móviles, guardar en el directorio de documentos
        try {
          savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents
          });
        } catch (e) {
          console.error('Error al guardar la imagen:', e);
          // Intentar con el directorio de caché si falla
          savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
        }
      } else {
        // Para web, usar localStorage
        savedFile = { uri: base64Data };
      }

      // Agregar a la galería
      this.gallery.push(savedFile.uri);
      this.saveGallery();

      return savedFile.uri;
    } catch (error) {
      console.error('Error al capturar imagen:', error);
      await this.showErrorAlert('Error al capturar la imagen: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  // Método web-específico para capturar imagen
  private takePictureWeb(): Promise<Photo> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            resolve({
              webPath: dataUrl,
              format: 'jpeg'
            } as Photo);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } else {
          reject(new Error('No se seleccionó ningún archivo'));
        }
      };
      input.click();
    });
  }

  // Convertir imagen a base64
  private async readAsBase64(photo: Photo): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await fetch(photo.webPath!);
        const blob = await response.blob();
        return await this.convertBlobToBase64(blob) as string;
      } catch (error) {
        console.error('Error al convertir imagen a base64:', error);
        throw error;
      }
    }
    return photo.webPath || '';
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // Guardar la galería en el almacenamiento local
  private saveGallery() {
    try {
      localStorage.setItem('photo_gallery', JSON.stringify(this.gallery));
    } catch (error) {
      console.error('Error al guardar la galería:', error);
    }
  }

  // Cargar la galería desde el almacenamiento local
  private loadGallery() {
    try {
      const savedGallery = localStorage.getItem('photo_gallery');
      this.gallery = savedGallery ? JSON.parse(savedGallery) : [];
    } catch (error) {
      console.error('Error al cargar la galería:', error);
      this.gallery = [];
    }
  }

  // Obtener la galería
  getGallery(): string[] {
    return this.gallery;
  }

  // Eliminar una foto específica
  async deletePhoto(photoUrl: string) {
    try {
      if (Capacitor.isNativePlatform()) {
        // Extraer el nombre del archivo de la URL
        const fileName = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
        
        // Eliminar del sistema de archivos
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Documents
        }).catch(async (err) => {
          // Intentar eliminar del directorio de caché si falla
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache
          });
        });
      }
      
      // Eliminar de la galería
      this.gallery = this.gallery.filter(url => url !== photoUrl);
      this.saveGallery();
    } catch (error) {
      console.error('Error al eliminar la foto:', error);
    }
  }

  // Eliminar toda la galería
  async clearGallery() {
    try {
      if (Capacitor.isNativePlatform()) {
        // Eliminar todas las fotos del sistema de archivos
        for (const photoUrl of this.gallery) {
          try {
            // Extraer el nombre del archivo de la URL
            const fileName = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
            
            await Filesystem.deleteFile({
              path: fileName,
              directory: Directory.Documents
            }).catch(async () => {
              // Intentar eliminar del directorio de caché si falla
              await Filesystem.deleteFile({
                path: fileName,
                directory: Directory.Cache
              });
            });
          } catch (e) {
            console.error('Error al eliminar archivo:', e);
          }
        }
      }
      
      // Limpiar la galería
      this.gallery = [];
      this.saveGallery();
    } catch (error) {
      console.error('Error al limpiar la galería:', error);
    }
  }

  // Método para mostrar alerta de permisos
  private async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permisos de Cámara',
      message: 'La aplicación necesita permisos de cámara para funcionar. Por favor, habilite los permisos en la configuración de la aplicación.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Abrir Configuración',
          handler: () => {
            // Idealmente, abrir la configuración del dispositivo
            if (Capacitor.isNativePlatform()) {
              // Se podría usar un plugin como App para abrir la configuración
              console.log('Abrir configuración de la aplicación');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Método para mostrar alerta de permisos de almacenamiento
  private async showStoragePermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permisos de Almacenamiento',
      message: 'La aplicación necesita permisos de almacenamiento para guardar las fotos. Por favor, habilite los permisos en la configuración de la aplicación.',
      buttons: ['OK']
    });
    await alert.present();
  }

  // Método para mostrar alerta de error
  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}