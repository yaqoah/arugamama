export interface CashflowApiRequest {
  emirate: string;
  layout: string;
  annual_rent: number;
  cheques: number;
  ac_type: string;
  is_furnished: boolean;
  move_in_month: number;
}

export interface CashflowApiResponse {
  success: boolean;
  day1_cash_wall: number;
  upfront_breakdown: {
    first_cheque: number;
    security_deposit: number;
    agency_commission: number;
    attestation_fee: number;
    utility_deposits: number;
    chiller_deposit: number;
  };
  predicted_overhead: {
    peak_summer_utility: number;
    winter_baseline_utility: number;
    liquidity_risk_score: number;
  };
}

export interface ExportRequest {
  export_type: 'ical' | 'pdf';
  lease_start_date: string;
  annual_rent: number;
  cheques: number;
  property_label: string;
}

/**
 * Calculates deterministic upfront move-in costs in the UAE
 * based on standard industry rules.
 */
function calculateUpfrontCosts(req: CashflowApiRequest) {
  const first_cheque = req.annual_rent / req.cheques;
  const security_deposit = req.is_furnished ? req.annual_rent * 0.10 : req.annual_rent * 0.05;
  const agency_commission = req.annual_rent * 0.05; // Standard 5%
  
  // Ejari (Dubai) or Tawtheeq (Abu Dhabi) approx fee
  const attestation_fee = req.emirate === 'Dubai' ? 220 : (req.emirate === 'Abu Dhabi' ? 100 : 0);
  
  // DEWA/ADDC deposits
  let utility_deposits = 1500;
  if (req.emirate === 'Dubai') {
    utility_deposits = req.layout.includes('Villa') ? 4000 : 2000;
  }
  
  // District Cooling deposit
  const chiller_deposit = req.ac_type === 'District Cooling' ? 1500 : 0;

  const day1_cash_wall = 
    first_cheque + 
    security_deposit + 
    agency_commission + 
    attestation_fee + 
    utility_deposits + 
    chiller_deposit;

  return {
    day1_cash_wall,
    upfront_breakdown: {
      first_cheque,
      security_deposit,
      agency_commission,
      attestation_fee,
      utility_deposits,
      chiller_deposit
    }
  };
}

/**
 * Mock prediction fallback for local development when API is unavailable.
 * Uses rule-of-thumb estimates based on typical UAE utility costs.
 */
function getMockPrediction(req: CashflowApiRequest): CashflowApiResponse['predicted_overhead'] {
  const baseRent = req.annual_rent / 12; // Monthly rent
  
  // Rule-of-thumb utility estimates (AED/month)
  let winterBaseline = baseRent * 0.08; // ~8% of rent in winter
  let peakSummer = baseRent * 0.15; // ~15% of rent in peak summer
  
  // Adjust for property type
  if (req.layout.includes('Villa')) {
    winterBaseline *= 1.3;
    peakSummer *= 1.5;
  }
  
  // Adjust for cooling type
  if (req.ac_type === 'District Cooling') {
    peakSummer *= 1.4; // District cooling adds ~40% in summer
  } else if (req.ac_type === 'Chiller Free') {
    peakSummer *= 0.7; // Chiller-free reduces summer costs
  }

  // Risk score based on utility ratio
  const ratio = peakSummer / (baseRent || 1);
  const riskScore = Math.min(10, Math.max(0, Math.round(ratio * 8)));

  return {
    peak_summer_utility: Math.round(peakSummer),
    winter_baseline_utility: Math.round(winterBaseline),
    liquidity_risk_score: riskScore,
  };
}

/**
 * API Service class encapsulating serverless route interactions
 */
export const ApiService = {
  /**
   * Fetches utility predictions and computes full cashflow breakdown
   */
  async getCashflowPrediction(req: CashflowApiRequest, config?: { signal?: AbortSignal }): Promise<CashflowApiResponse> {
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
        signal: config?.signal,
      });

      if (!response.ok) {
        throw new Error('Prediction API failed');
      }

      const predicted_overhead = await response.json();
      const upfrontData = calculateUpfrontCosts(req);

      return {
        success: true,
        day1_cash_wall: upfrontData.day1_cash_wall,
        upfront_breakdown: upfrontData.upfront_breakdown,
        predicted_overhead,
      };
    } catch (error) {
      // Fallback to mock predictions for local development
      console.warn('API unavailable, using mock data:', error);
      const predicted_overhead = getMockPrediction(req);
      const upfrontData = calculateUpfrontCosts(req);

      return {
        success: true,
        day1_cash_wall: upfrontData.day1_cash_wall,
        upfront_breakdown: upfrontData.upfront_breakdown,
        predicted_overhead,
      };
    }
  },

  /**
   * Triggers the export API to download either an iCal file or a PDF
   */
  async exportSchedule(req: ExportRequest): Promise<void> {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        throw new Error('Export API failed');
      }

      // Check if response is HTML fallback for printing
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('text/html')) {
        // Render fallback HTML in a new print window
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } else {
        // Trigger generic file download (iCal or PDF)
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename = req.export_type === 'ical' ? 'rent_schedule.ics' : 'rent_schedule.pdf';
        
        // Try to extract exact filename from Content-Disposition if present
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const matches = /filename="([^"]+)"/.exec(disposition);
          if (matches != null && matches[1]) filename = matches[1];
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting schedule:', error);
      throw error;
    }
  }
};
