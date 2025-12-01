import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Network } from '@capacitor/network';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  bearing: number;
  altitude: number;
  timestamp: number;
}

export interface TrackingOptions {
  interval?: number;
  minDistance?: number;
}

export interface LocationTrackingPlugin {
  startTracking(options?: TrackingOptions): Promise<{ success: boolean; message: string }>;
  stopTracking(): Promise<{ success: boolean; message: string }>;
  getLastLocation(): Promise<LocationData>;
  isTracking(): Promise<{ isTracking: boolean }>;
  checkPermissions(): Promise<{ location: string }>;
  requestPermissions(): Promise<{ location: string }>;
  addListener(eventName: 'locationUpdate', listenerFunc: (location: LocationData) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'locationError', listenerFunc: (error: { error: string }) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'permissionChange', listenerFunc: (data: { status: string }) => void): Promise<{ remove: () => Promise<void> }>;
  removeAllListeners(): Promise<void>;
}

export const LocationTracking = registerPlugin<LocationTrackingPlugin>('LocationTracking');

export const isCapacitor = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

export class LocationService {
  private static watchId: string | null = null;
  private static nativeListener: { remove: () => Promise<void> } | null = null;
  private static callbacks: Set<(location: LocationData) => void> = new Set();

  static async startTracking(
    callback: (location: LocationData) => void,
    options?: TrackingOptions
  ): Promise<void> {
    this.callbacks.add(callback);

    if (isCapacitor() && !isWeb()) {
      if (!this.nativeListener) {
        this.nativeListener = await LocationTracking.addListener('locationUpdate', (location) => {
          this.callbacks.forEach(cb => cb(location));
        });

        await LocationTracking.startTracking({
          interval: options?.interval ?? 5000,
          minDistance: options?.minDistance ?? 10
        });
      }
    } else {
      if (!this.watchId) {
        const id = await CapacitorGeolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          },
          (position, err) => {
            if (err) {
              console.error('Geolocation error:', err);
              return;
            }
            if (position) {
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy ?? 0,
                speed: position.coords.speed ?? 0,
                bearing: position.coords.heading ?? 0,
                altitude: position.coords.altitude ?? 0,
                timestamp: position.timestamp
              };
              this.callbacks.forEach(cb => cb(locationData));
            }
          }
        );
        this.watchId = id;
      }
    }
  }

  static async stopTracking(callback?: (location: LocationData) => void): Promise<void> {
    if (callback) {
      this.callbacks.delete(callback);
    } else {
      this.callbacks.clear();
    }

    if (this.callbacks.size === 0) {
      if (isCapacitor() && !isWeb()) {
        if (this.nativeListener) {
          await this.nativeListener.remove();
          this.nativeListener = null;
        }
        await LocationTracking.stopTracking();
      } else {
        if (this.watchId) {
          await CapacitorGeolocation.clearWatch({ id: this.watchId });
          this.watchId = null;
        }
      }
    }
  }

  static async getCurrentPosition(): Promise<LocationData> {
    if (isCapacitor() && !isWeb()) {
      try {
        return await LocationTracking.getLastLocation();
      } catch {
        const position = await CapacitorGeolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? 0,
          speed: position.coords.speed ?? 0,
          bearing: position.coords.heading ?? 0,
          altitude: position.coords.altitude ?? 0,
          timestamp: position.timestamp
        };
      }
    } else {
      const position = await CapacitorGeolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? 0,
        speed: position.coords.speed ?? 0,
        bearing: position.coords.heading ?? 0,
        altitude: position.coords.altitude ?? 0,
        timestamp: position.timestamp
      };
    }
  }

  static async checkPermissions(): Promise<boolean> {
    if (isCapacitor() && !isWeb()) {
      const result = await LocationTracking.checkPermissions();
      return result.location === 'granted';
    } else {
      const result = await CapacitorGeolocation.checkPermissions();
      return result.location === 'granted';
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (isCapacitor() && !isWeb()) {
      const result = await LocationTracking.requestPermissions();
      return result.location === 'granted';
    } else {
      const result = await CapacitorGeolocation.requestPermissions();
      return result.location === 'granted';
    }
  }
}

export class CameraService {
  static async takePhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false
      });
      return image.webPath ?? null;
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  }

  static async pickFromGallery(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });
      return image.webPath ?? null;
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    const result = await Camera.checkPermissions();
    return result.camera === 'granted' && result.photos === 'granted';
  }

  static async requestPermissions(): Promise<boolean> {
    const result = await Camera.requestPermissions();
    return result.camera === 'granted' && result.photos === 'granted';
  }
}

export class NotificationService {
  private static isRegistered = false;
  private static callbacks: Set<(notification: any) => void> = new Set();

  static async register(): Promise<boolean> {
    if (!isCapacitor() || isWeb()) {
      return false;
    }

    if (this.isRegistered) {
      return true;
    }

    try {
      const permResult = await PushNotifications.checkPermissions();
      
      if (permResult.receive !== 'granted') {
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive !== 'granted') {
          return false;
        }
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        this.callbacks.forEach(cb => cb(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        this.callbacks.forEach(cb => cb(notification.notification));
      });

      this.isRegistered = true;
      return true;
    } catch (error) {
      console.error('Push notification setup error:', error);
      return false;
    }
  }

  static addListener(callback: (notification: any) => void): void {
    this.callbacks.add(callback);
  }

  static removeListener(callback: (notification: any) => void): void {
    this.callbacks.delete(callback);
  }
}

export class NetworkService {
  private static callbacks: Set<(connected: boolean) => void> = new Set();
  private static isListening = false;

  static async isConnected(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
  }

  static async getConnectionType(): Promise<string> {
    const status = await Network.getStatus();
    return status.connectionType;
  }

  static addListener(callback: (connected: boolean) => void): void {
    this.callbacks.add(callback);

    if (!this.isListening) {
      Network.addListener('networkStatusChange', (status) => {
        this.callbacks.forEach(cb => cb(status.connected));
      });
      this.isListening = true;
    }
  }

  static removeListener(callback: (connected: boolean) => void): void {
    this.callbacks.delete(callback);
  }
}
