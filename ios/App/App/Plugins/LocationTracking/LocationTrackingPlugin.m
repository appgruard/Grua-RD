#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(LocationTrackingPlugin, "LocationTracking",
    CAP_PLUGIN_METHOD(startTracking, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopTracking, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getLastLocation, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isTracking, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
)
