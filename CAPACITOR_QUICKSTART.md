# 🚀 Capacitor Quick Start - Grúa RD

## ⚡ Inicio Rápido (3 pasos)

### 1. Inicializar Android
```bash
npx cap add android
```

### 2. Build y Sincronizar
```bash
npm run build
npx cap sync android
```

### 3. Abrir en Android Studio
```bash
npx cap open android
```

Luego presiona el botón ▶️ **Run** en Android Studio.

---

## 📱 Scripts Útiles

```bash
# Build completo + sync
npm run build && npx cap sync android

# Solo copiar assets (más rápido)
npx cap copy android

# Actualizar plugins
npx cap update android

# Ver logs del dispositivo
npx cap run android --livereload
```

---

## 🔧 Configuración de Desarrollo Local

Para probar con backend local en dispositivo real:

1. Editar `capacitor.config.ts`:
```typescript
server: {
  url: 'http://TU_IP_LOCAL:5000', // ej: http://192.168.1.100:5000
  cleartext: true
}
```

2. Rebuild:
```bash
npx cap sync android
```

---

## 📚 Documentación Completa

Ver **[MIGRACION_ANDROID.md](./MIGRACION_ANDROID.md)** para:
- Instalación de Android Studio
- Permisos de Android
- Build para producción (APK/AAB)
- Publicación en Play Store
- Troubleshooting

---

## 🎯 Próximos Pasos

1. ✅ Configuración base hecha
2. ⏳ Instalar Android Studio
3. ⏳ Ejecutar `npx cap add android`
4. ⏳ Probar en emulador/dispositivo
5. ⏳ Generar keystore para release
6. ⏳ Build APK/AAB firmado
7. ⏳ Publicar en Play Store

---

**¿Necesitas ayuda?** Consulta MIGRACION_ANDROID.md o la [documentación oficial de Capacitor](https://capacitorjs.com/docs/android)
