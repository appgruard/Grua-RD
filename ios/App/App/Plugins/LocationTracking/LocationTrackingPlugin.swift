import Foundation
import Capacitor
import CoreLocation

@objc(LocationTrackingPlugin)
public class LocationTrackingPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "LocationTrackingPlugin"
    public let jsName = "LocationTracking"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLastLocation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise)
    ]
    
    private var locationManager: CLLocationManager?
    private var lastLocation: CLLocation?
    private var isCurrentlyTracking = false
    private var pendingPermissionCall: CAPPluginCall?
    
    public override func load() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
        locationManager?.allowsBackgroundLocationUpdates = true
        locationManager?.pausesLocationUpdatesAutomatically = false
        locationManager?.showsBackgroundLocationIndicator = true
    }
    
    @objc func startTracking(_ call: CAPPluginCall) {
        let status = locationManager?.authorizationStatus ?? .notDetermined
        
        guard status == .authorizedAlways || status == .authorizedWhenInUse else {
            pendingPermissionCall = call
            locationManager?.requestAlwaysAuthorization()
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let interval = call.getDouble("interval") ?? 5000
            let minDistance = call.getDouble("minDistance") ?? 10.0
            
            self.locationManager?.distanceFilter = minDistance
            self.locationManager?.startUpdatingLocation()
            self.locationManager?.startMonitoringSignificantLocationChanges()
            
            self.isCurrentlyTracking = true
            
            call.resolve([
                "success": true,
                "message": "Tracking started"
            ])
        }
    }
    
    @objc func stopTracking(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.locationManager?.stopUpdatingLocation()
            self.locationManager?.stopMonitoringSignificantLocationChanges()
            self.isCurrentlyTracking = false
            
            call.resolve([
                "success": true,
                "message": "Tracking stopped"
            ])
        }
    }
    
    @objc func getLastLocation(_ call: CAPPluginCall) {
        guard let location = lastLocation else {
            call.reject("No location available")
            return
        }
        
        call.resolve(locationToDict(location))
    }
    
    @objc func isTracking(_ call: CAPPluginCall) {
        call.resolve([
            "isTracking": isCurrentlyTracking
        ])
    }
    
    @objc func checkPermissions(_ call: CAPPluginCall) {
        let status = locationManager?.authorizationStatus ?? .notDetermined
        call.resolve([
            "location": permissionStatusToString(status)
        ])
    }
    
    @objc func requestPermissions(_ call: CAPPluginCall) {
        let status = locationManager?.authorizationStatus ?? .notDetermined
        
        if status == .notDetermined {
            pendingPermissionCall = call
            locationManager?.requestAlwaysAuthorization()
        } else {
            call.resolve([
                "location": permissionStatusToString(status)
            ])
        }
    }
    
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        lastLocation = location
        
        let data = locationToDict(location)
        notifyListeners("locationUpdate", data: data)
    }
    
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("locationError", data: [
            "error": error.localizedDescription
        ])
    }
    
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        
        notifyListeners("permissionChange", data: [
            "status": permissionStatusToString(status)
        ])
        
        if let call = pendingPermissionCall {
            if status == .authorizedAlways || status == .authorizedWhenInUse {
                startTracking(call)
            } else if status == .denied || status == .restricted {
                call.reject("Location permission denied")
            }
            pendingPermissionCall = nil
        }
    }
    
    private func locationToDict(_ location: CLLocation) -> [String: Any] {
        return [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "speed": location.speed >= 0 ? location.speed : 0,
            "bearing": location.course >= 0 ? location.course : 0,
            "altitude": location.altitude,
            "timestamp": Int64(location.timestamp.timeIntervalSince1970 * 1000)
        ]
    }
    
    private func permissionStatusToString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "prompt"
        case .restricted, .denied:
            return "denied"
        case .authorizedWhenInUse:
            return "granted"
        case .authorizedAlways:
            return "granted"
        @unknown default:
            return "prompt"
        }
    }
}
