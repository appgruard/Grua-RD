package com.fouronesolutions.gruard.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

public class LocationTrackingService extends Service {
    private static final String TAG = "LocationTrackingService";
    private static final String CHANNEL_ID = "gruard_location_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private final IBinder binder = new LocalBinder();
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private Location lastLocation;
    private boolean isTracking = false;
    private LocationUpdateListener locationUpdateListener;
    
    public interface LocationUpdateListener {
        void onLocationUpdate(Location location);
    }
    
    public class LocalBinder extends Binder {
        public LocationTrackingService getService() {
            return LocationTrackingService.this;
        }
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
        Log.d(TAG, "Service created");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, createNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, createNotification());
        }
        
        if (intent != null) {
            int interval = intent.getIntExtra("interval", 5000);
            float minDistance = intent.getFloatExtra("minDistance", 10f);
            startTracking(interval, minDistance);
        }
        
        return START_STICKY;
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
    
    public void setLocationUpdateListener(LocationUpdateListener listener) {
        this.locationUpdateListener = listener;
    }
    
    public void startTracking(int intervalMs, float minDistanceMeters) {
        if (isTracking) {
            stopTracking();
        }
        
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateDistanceMeters(minDistanceMeters)
            .setWaitForAccurateLocation(false)
            .build();
        
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                
                for (Location location : locationResult.getLocations()) {
                    lastLocation = location;
                    Log.d(TAG, "Location update: " + location.getLatitude() + ", " + location.getLongitude());
                    
                    if (locationUpdateListener != null) {
                        locationUpdateListener.onLocationUpdate(location);
                    }
                    
                    updateNotification(location);
                }
            }
        };
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            );
            isTracking = true;
            Log.d(TAG, "Tracking started");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission not granted", e);
        }
    }
    
    public void stopTracking() {
        if (locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            locationCallback = null;
        }
        isTracking = false;
        Log.d(TAG, "Tracking stopped");
    }
    
    public Location getLastLocation() {
        return lastLocation;
    }
    
    public boolean isTracking() {
        return isTracking;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Seguimiento de Ubicación",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notificación de seguimiento de ubicación en tiempo real para servicios de grúa");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent();
        notificationIntent.setClassName(this, "com.fouronesolutions.gruard.MainActivity");
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Grúa RD - Servicio Activo")
            .setContentText("Compartiendo ubicación en tiempo real")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    private void updateNotification(Location location) {
        String text = String.format("Ubicación: %.4f, %.4f", location.getLatitude(), location.getLongitude());
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Grúa RD - Servicio Activo")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }
    }
    
    @Override
    public void onDestroy() {
        stopTracking();
        super.onDestroy();
        Log.d(TAG, "Service destroyed");
    }
}
