package com.fouronesolutions.gruard.plugins;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.fouronesolutions.gruard.services.LocationTrackingService;

@CapacitorPlugin(
    name = "LocationTracking",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = {
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class LocationTrackingPlugin extends Plugin {
    private static final String TAG = "LocationTrackingPlugin";
    
    private LocationTrackingService trackingService;
    private boolean isServiceBound = false;
    private PluginCall pendingStartCall = null;
    
    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            LocationTrackingService.LocalBinder binder = (LocationTrackingService.LocalBinder) service;
            trackingService = binder.getService();
            isServiceBound = true;
            
            trackingService.setLocationUpdateListener(location -> {
                JSObject ret = new JSObject();
                ret.put("latitude", location.getLatitude());
                ret.put("longitude", location.getLongitude());
                ret.put("accuracy", location.getAccuracy());
                ret.put("speed", location.getSpeed());
                ret.put("bearing", location.getBearing());
                ret.put("altitude", location.getAltitude());
                ret.put("timestamp", location.getTime());
                notifyListeners("locationUpdate", ret);
            });
            
            if (pendingStartCall != null) {
                startTrackingInternal(pendingStartCall);
                pendingStartCall = null;
            }
            
            Log.d(TAG, "Service connected");
        }
        
        @Override
        public void onServiceDisconnected(ComponentName name) {
            trackingService = null;
            isServiceBound = false;
            Log.d(TAG, "Service disconnected");
        }
    };
    
    @Override
    public void load() {
        super.load();
        bindToService();
    }
    
    private void bindToService() {
        Intent intent = new Intent(getContext(), LocationTrackingService.class);
        getContext().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }
    
    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "locationPermissionCallback");
            return;
        }
        
        if (!isServiceBound) {
            pendingStartCall = call;
            bindToService();
            return;
        }
        
        startTrackingInternal(call);
    }
    
    private void startTrackingInternal(PluginCall call) {
        try {
            int intervalMs = call.getInt("interval", 5000);
            float minDistance = call.getFloat("minDistance", 10f);
            
            Intent serviceIntent = new Intent(getContext(), LocationTrackingService.class);
            serviceIntent.putExtra("interval", intervalMs);
            serviceIntent.putExtra("minDistance", minDistance);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            if (trackingService != null) {
                trackingService.startTracking(intervalMs, minDistance);
            }
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Tracking started");
            call.resolve(ret);
            
            Log.d(TAG, "Tracking started with interval: " + intervalMs + "ms");
        } catch (Exception e) {
            Log.e(TAG, "Error starting tracking", e);
            call.reject("Failed to start tracking: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void stopTracking(PluginCall call) {
        try {
            if (trackingService != null) {
                trackingService.stopTracking();
            }
            
            Intent serviceIntent = new Intent(getContext(), LocationTrackingService.class);
            getContext().stopService(serviceIntent);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Tracking stopped");
            call.resolve(ret);
            
            Log.d(TAG, "Tracking stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping tracking", e);
            call.reject("Failed to stop tracking: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getLastLocation(PluginCall call) {
        if (trackingService != null && trackingService.getLastLocation() != null) {
            android.location.Location location = trackingService.getLastLocation();
            JSObject ret = new JSObject();
            ret.put("latitude", location.getLatitude());
            ret.put("longitude", location.getLongitude());
            ret.put("accuracy", location.getAccuracy());
            ret.put("speed", location.getSpeed());
            ret.put("bearing", location.getBearing());
            ret.put("altitude", location.getAltitude());
            ret.put("timestamp", location.getTime());
            call.resolve(ret);
        } else {
            call.reject("No location available");
        }
    }
    
    @PluginMethod
    public void isTracking(PluginCall call) {
        boolean tracking = trackingService != null && trackingService.isTracking();
        JSObject ret = new JSObject();
        ret.put("isTracking", tracking);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        super.checkPermissions(call);
    }
    
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        super.requestPermissions(call);
    }
    
    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            if (!isServiceBound) {
                pendingStartCall = call;
                bindToService();
            } else {
                startTrackingInternal(call);
            }
        } else {
            call.reject("Location permissions are required for tracking");
        }
    }
    
    private boolean hasRequiredPermissions() {
        return getPermissionState("location") == PermissionState.GRANTED;
    }
    
    @Override
    protected void handleOnDestroy() {
        if (isServiceBound) {
            getContext().unbindService(serviceConnection);
            isServiceBound = false;
        }
        super.handleOnDestroy();
    }
}
