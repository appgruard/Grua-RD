import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Navigation, Loader2, X, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Coordinates } from '@/lib/maps';

interface AddressSuggestion {
  id: string;
  placeName: string;
  text: string;
  coordinates: Coordinates;
}

interface AddressSearchInputProps {
  label: string;
  placeholder?: string;
  value: string;
  coordinates?: Coordinates | null;
  onAddressChange: (address: string, coordinates: Coordinates) => void;
  onClear?: () => void;
  currentLocation?: Coordinates;
  icon?: 'origin' | 'destination';
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AddressSearchInput({
  label,
  placeholder = 'Buscar dirección...',
  value,
  coordinates,
  onAddressChange,
  onClear,
  currentLocation,
  icon = 'origin',
  autoFocus = false,
  disabled = false,
  className,
}: AddressSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const parseCoordinates = (input: string): Coordinates | null => {
    const cleaned = input.trim().replace(/\s+/g, ' ');
    
    const patterns = [
      /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/,
      /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
      /^lat[:\s]*(-?\d+\.?\d*)[,\s]+(?:lng|lon)[:\s]*(-?\d+\.?\d*)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const first = parseFloat(match[1]);
        const second = parseFloat(match[2]);
        
        if (first >= -90 && first <= 90 && second >= -180 && second <= 180) {
          return { lat: first, lng: second };
        }
        if (second >= -90 && second <= 90 && first >= -180 && first <= 180) {
          return { lat: second, lng: first };
        }
      }
    }
    return null;
  };

  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<AddressSuggestion | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&language=es`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          return {
            id: `coords-${coords.lat}-${coords.lng}`,
            placeName: feature.place_name || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            text: feature.text || 'Ubicación seleccionada',
            coordinates: coords,
          };
        }
      }
      return {
        id: `coords-${coords.lat}-${coords.lng}`,
        placeName: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        text: 'Coordenadas ingresadas',
        coordinates: coords,
      };
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      return {
        id: `coords-${coords.lat}-${coords.lng}`,
        placeName: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        text: 'Coordenadas ingresadas',
        coordinates: coords,
      };
    }
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const coords = parseCoordinates(query);
    if (coords) {
      setIsLoading(true);
      try {
        const suggestion = await reverseGeocode(coords);
        if (suggestion) {
          setSuggestions([suggestion]);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/maps/autocomplete?query=${encodeURIComponent(query)}`;
      if (currentLocation) {
        url += `&proximity=${currentLocation.lng},${currentLocation.lat}`;
      }
      
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, reverseGeocode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.placeName);
    setSuggestions([]);
    onAddressChange(suggestion.placeName, suggestion.coordinates);
    setIsFocused(false);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) return;
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
          );
          const data = await response.json();
          const address = data.features?.[0]?.place_name || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setInputValue(address);
          onAddressChange(address, coords);
        } catch (error) {
          const address = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setInputValue(address);
          onAddressChange(address, coords);
        }
        setIsGettingLocation(false);
        setSuggestions([]);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    onClear?.();
    inputRef.current?.focus();
  };

  const showSuggestions = isFocused && (suggestions.length > 0 || isLoading);

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          'w-3 h-3 rounded-full flex-shrink-0',
          icon === 'origin' ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            className="pl-10 pr-20 h-12 text-base"
            data-testid={`input-address-${icon}`}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {inputValue && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleClear}
                disabled={disabled}
                data-testid={`button-clear-${icon}`}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleUseCurrentLocation}
              disabled={disabled || isGettingLocation}
              data-testid={`button-current-location-${icon}`}
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {showSuggestions && (
          <Card className="absolute z-50 w-full mt-1 max-h-[50vh] overflow-y-auto shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="py-1">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 px-4 py-3 hover-elevate text-left transition-colors"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      data-testid={`suggestion-${suggestion.id}`}
                    >
                      <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{suggestion.text}</p>
                        <p className="text-xs text-muted-foreground truncate">{suggestion.placeName}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {coordinates && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Navigation className="w-3 h-3" />
          <span>{coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}
