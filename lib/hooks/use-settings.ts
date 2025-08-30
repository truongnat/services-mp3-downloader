import { useState, useEffect, useCallback } from 'react';
import { AudioSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export interface UseSettingsReturn {
  settings: AudioSettings;
  updateSettings: (newSettings: AudioSettings) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('audioSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Listen for storage changes to sync across tabs/components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'audioSettings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (error) {
          console.error('Failed to parse settings from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update settings and save to localStorage
  const updateSettings = useCallback((newSettings: AudioSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('audioSettings', JSON.stringify(newSettings));
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('settingsChanged', { 
          detail: newSettings 
        }));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  }, []);

  // Reset to default settings
  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
  };
}