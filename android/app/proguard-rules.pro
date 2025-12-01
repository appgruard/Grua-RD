# Grúa RD - ProGuard Rules for Production Build
# =============================================

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

# Hide source file names in stack traces
-renamesourcefileattribute SourceFile

# Capacitor Core
-keep class com.getcapacitor.** { *; }
-keep @interface com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.** <methods>;
}

# Capacitor Plugins
-keep class com.getcapacitor.plugin.** { *; }

# Geolocation Plugin
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Camera Plugin
-keep class android.hardware.camera2.** { *; }
-keep class androidx.camera.** { *; }

# Push Notifications (Firebase)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.firebase.**

# Network/HTTP
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# WebView
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}

# Cordova
-keep class org.apache.cordova.** { *; }
-keep class org.apache.cordova.CallbackContext { *; }

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# JSON/Serialization
-keep class org.json.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Enum
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Suppress warnings
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
