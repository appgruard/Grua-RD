package com.fouronesolutions.gruard.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import com.fouronesolutions.gruard.services.LocationTrackingService;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String PREFS_NAME = "gruard_tracking_prefs";
    private static final String KEY_TRACKING_ENABLED = "tracking_enabled";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Boot completed received");
            
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean wasTrackingEnabled = prefs.getBoolean(KEY_TRACKING_ENABLED, false);
            
            if (wasTrackingEnabled) {
                Log.d(TAG, "Restarting location tracking service");
                Intent serviceIntent = new Intent(context, LocationTrackingService.class);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
    
    public static void setTrackingEnabled(Context context, boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_TRACKING_ENABLED, enabled).apply();
    }
}
