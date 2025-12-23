'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  LocaleConfig,
  getUserLocale,
  storeLocalePreference,
  getLocaleForCountry,
  convertPrice,
  formatCurrency,
  SupportedCurrency,
} from '@/lib/localization';

interface LocalizationContextType {
  locale: LocaleConfig;
  setLocale: (locale: LocaleConfig) => void;
  convertPrice: (priceUSD: number) => { amount: number; currency: SupportedCurrency; formatted: string };
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleConfig>(getLocaleForCountry('US'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale on mount
  useEffect(() => {
    const initLocale = async () => {
      try {
        const userLocale = await getUserLocale();
        setLocaleState(userLocale);
      } catch (error) {
        console.error('Failed to initialize locale:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initLocale();
  }, []);

  const setLocale = (newLocale: LocaleConfig) => {
    setLocaleState(newLocale);
    storeLocalePreference(newLocale);
  };

  const convertPriceWrapper = (priceUSD: number) => {
    return convertPrice(priceUSD, locale.currency, locale.country);
  };

  const formatCurrencyWrapper = (amount: number) => {
    return formatCurrency(amount, locale.currency);
  };

  return (
    <LocalizationContext.Provider
      value={{
        locale,
        setLocale,
        convertPrice: convertPriceWrapper,
        formatCurrency: formatCurrencyWrapper,
        isLoading,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
