import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

interface NativeImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  'data-testid'?: string;
}

export function NativeImage({ src, alt = '', className, style, onClick, 'data-testid': testId }: NativeImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      if (Capacitor.isNativePlatform()) {
        try {
          const response = await CapacitorHttp.get({
            url: src,
            responseType: 'blob',
          });

          if (response.status >= 200 && response.status < 300 && response.data) {
            const base64 = response.data;
            const contentType = response.headers['content-type'] || 'image/jpeg';
            setImageSrc(`data:${contentType};base64,${base64}`);
          } else {
            console.error('Failed to load image:', response.status);
            setError(true);
          }
        } catch (e) {
          console.error('Error loading image via CapacitorHttp:', e);
          setError(true);
        }
      } else {
        setImageSrc(src);
      }

      setLoading(false);
    };

    loadImage();
  }, [src]);

  if (loading) {
    return (
      <div 
        className={className} 
        style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}
        data-testid={testId}
      >
        <div className="animate-pulse bg-muted rounded w-full h-full" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div 
        className={className} 
        style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}
        data-testid={testId}
      >
        <span className="text-muted-foreground text-sm">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      data-testid={testId}
      onError={() => setError(true)}
    />
  );
}
