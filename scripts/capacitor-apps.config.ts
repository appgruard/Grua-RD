/**
 * Configuración de las aplicaciones móviles (Capacitor)
 * Solo Cliente y Conductor tienen apps nativas
 */

export interface AppConfig {
  appId: string;
  appName: string;
  displayName: string;
  bundleId: string;
  description: string;
  allowedRoutes: string[];
  defaultRoute: string;
  splashColor: string;
  primaryColor: string;
}

export const APP_CONFIGS: Record<string, AppConfig> = {
  cliente: {
    appId: 'com.fouronesolutions.gruard.cliente',
    appName: 'GruaRD Cliente',
    displayName: 'Grúa RD',
    bundleId: 'com.fouronesolutions.gruard.cliente',
    description: 'Solicita servicios de grúa en República Dominicana',
    allowedRoutes: ['/client', '/login', '/onboarding', '/verify-otp', '/forgot-password', '/privacy-policy'],
    defaultRoute: '/client',
    splashColor: '#0F2947',
    primaryColor: '#F5A623',
  },
  conductor: {
    appId: 'com.fouronesolutions.gruard.conductor',
    appName: 'GruaRD Conductor',
    displayName: 'Grúa RD Conductor',
    bundleId: 'com.fouronesolutions.gruard.conductor',
    description: 'App para conductores de grúa - Gestiona tus servicios',
    allowedRoutes: ['/driver', '/login', '/onboarding', '/verify-otp', '/verify-pending', '/privacy-policy'],
    defaultRoute: '/driver',
    splashColor: '#0F2947',
    primaryColor: '#4CAF50',
  },
};

export type AppType = keyof typeof APP_CONFIGS;

export function getAppConfig(appType: AppType): AppConfig {
  const config = APP_CONFIGS[appType];
  if (!config) {
    throw new Error(`Invalid app type: ${appType}. Valid types: ${Object.keys(APP_CONFIGS).join(', ')}`);
  }
  return config;
}
