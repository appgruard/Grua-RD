export interface BrowserInfo {
  acceptHeader: string;
  ipAddress: string;
  language: string;
  colorDepth: number;
  screenWidth: number;
  screenHeight: number;
  timeZone: string;
  userAgent: string;
  javaScriptEnabled: string;
}

export function getBrowserInfo(): BrowserInfo {
  return {
    acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    ipAddress: '0.0.0.0', // Se llena en el backend usualmente, pero se puede enviar placeholder
    language: navigator.language || 'en-US',
    colorDepth: window.screen ? window.screen.colorDepth : 24,
    screenWidth: window.screen ? window.screen.width * (window.devicePixelRatio || 1) : 1920,
    screenHeight: window.screen ? window.screen.height * (window.devicePixelRatio || 1) : 1080,
    timeZone: new Date().getTimezoneOffset().toString(),
    userAgent: navigator.userAgent,
    javaScriptEnabled: 'true',
  };
}
