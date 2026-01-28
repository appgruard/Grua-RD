# Capacitor ProGuard rules
# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep class com.fouronesolutions.gruard.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova classes
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep source file and line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Don't warn about missing classes
-dontwarn java.lang.invoke.*
-dontwarn **$$Lambda$*
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe

# Firebase/Push notifications
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Mapbox
-keep class com.mapbox.** { *; }
-dontwarn com.mapbox.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
