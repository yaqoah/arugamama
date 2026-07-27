import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_INPUT,
  LOCATIONS,
  type EmirateId,
  type ScenarioInput,
} from '@/lib/constants';
import { calculateCashflow, type CalculatorResult } from '@/utils/calculatorEngine';
import { ApiService, type CashflowApiResponse } from '@/lib/api';

export type CashflowState = {
  inputs: ScenarioInput;
  results: {
    calc: CalculatorResult;
    apiData: CashflowApiResponse | null;
  };
  isLoading: boolean;
  isBackendLive: boolean;
  error: string | null;
  update: <K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) => void;
  updateEmirate: (id: EmirateId) => void;
  reset: () => void;
};

const mapEmirate = (id: string) => {
  if (id === 'dubai') return 'Dubai';
  if (id === 'abu_dhabi') return 'Abu Dhabi';
  if (id === 'sharjah') return 'Sharjah';
  if (id === 'ajman') return 'Ajman';
  if (id === 'rak') return 'Ras Al Khaimah';
  return 'Dubai'; 
};

const mapLayout = (id: string, propertyType: string) => {
  if (propertyType === 'villa') return '4+ BR Villa';
  if (id === 'studio') return 'Studio';
  if (id === '1br') return '1 BR';
  if (id === '2br') return '2 BR';
  if (id === '3br') return '3 BR';
  return '4+ BR Villa';
};

const mapCooling = (id: string) => {
  if (id === 'chiller_free') return 'Chiller Free';
  if (id === 'district_cooling') return 'District Cooling';
  return 'Central DEWA/SEWA';
};

const mapMonth = (id: string) => {
  const map: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  return map[id] || 1;
};

/**
 * Central reactive state for the arugamama engine.
 *
 * Owns the inputs state and derives both the instant local math calculator result
 * and the debounced async ML prediction API calls, ensuring UI stays perfectly snappy.
 */
export function useCashflowState(): CashflowState {
  const [inputs, setInputs] = useState<ScenarioInput>(DEFAULT_INPUT);
  const [apiData, setApiData] = useState<CashflowApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Instantly calculate standard local UI totals (e.g. Agency Fee, DEWA config)
  const calc = useMemo(() => calculateCashflow(inputs), [inputs]);

  const update = useCallback(
    <K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateEmirate = useCallback(
    (id: EmirateId) => {
      setInputs((prev) => {
        const valid = LOCATIONS[id] ?? [];
        const locationValid = valid.some((l) => l.name === prev.location);
        return {
          ...prev,
          emirate: id,
          location: locationValid ? prev.location : (valid[0]?.name ?? prev.location),
        };
      });
    },
    []
  );

  const reset = useCallback(() => {
    setInputs(DEFAULT_INPUT);
  }, []);

  // Debounced API ML Prediction logic with request cancellation
  useEffect(() => {
    // 1. Immediately cancel any pending request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Wrap API call in debounce (200ms)
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const req = {
          emirate: mapEmirate(inputs.emirate),
          layout: mapLayout(inputs.layout, inputs.propertyType),
          annual_rent: inputs.annualRent,
          cheques: inputs.chequeFreq,
          ac_type: mapCooling(inputs.cooling),
          is_furnished: inputs.furnishing === 'furnished',
          move_in_month: mapMonth(inputs.moveInMonth)
        };

        const response = await ApiService.getCashflowPrediction(req, { signal: controller.signal });
        
        if (!controller.signal.aborted) {
          setApiData(response);
          setIsBackendLive(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setError(err.message || 'API Error');
          setIsBackendLive(false);
          setApiData(null); // Clear stale data on error
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort(); // Cleanup on unmount or input change
    };
  }, [inputs]);

  return {
    inputs,
    results: {
      calc,
      apiData
    },
    isLoading,
    isBackendLive,
    error,
    update,
    updateEmirate,
    reset,
  };
}
