import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Calendar, Download, FileText, Loader2, Rocket, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { formatAed, type ScenarioInput } from '@/lib/constants';
import { emirateLabel, monthLabel } from '@/lib/engine';
import type { CalculatorResult } from '@/utils/calculatorEngine';
import { MangaPanel, SectionLabel } from '@/components/primitives';
import { ApiService, type ExportRequest } from '@/lib/api';

type ActionDrawerProps = {
  input: ScenarioInput;
  calc: CalculatorResult;
};

/**
 * Component D — Action Drawer.
 * Connects directly to the backend /api/export endpoint using ApiService to fetch
 * generated .ics files and trigger PDF exports (via n8n or print fallback).
 */
export function ActionDrawer({ input, calc }: ActionDrawerProps) {
  const [open, setOpen] = useState(false);
  
  const [pdfRunning, setPdfRunning] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [icsRunning, setIcsRunning] = useState(false);
  const [icsDone, setIcsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLeaseDate = () => {
    const d = new Date();
    const targetMonth = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }[input.moveInMonth] ?? 0;
    
    let y = d.getFullYear();
    // If the target month has passed this year, assume they mean next year
    if (d.getMonth() > targetMonth) {
      y += 1;
    }
    return `${y}-${String(targetMonth + 1).padStart(2, '0')}-01`;
  };

  const handleExportPdf = async () => {
    setPdfRunning(true);
    setPdfDone(false);
    setError(null);
    try {
      const payload: ExportRequest = {
        export_type: 'pdf',
        lease_start_date: getLeaseDate(),
        annual_rent: input.annualRent,
        cheques: input.chequeFreq,
        property_label: `${input.layout.toUpperCase()} in ${input.location}, ${emirateLabel(input.emirate)}`
      };
      await ApiService.exportSchedule(payload);
      setPdfDone(true);
      setTimeout(() => setPdfDone(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setPdfRunning(false);
    }
  };

  const handleDownloadCalendar = async () => {
    setIcsRunning(true);
    setIcsDone(false);
    setError(null);
    try {
      const payload: ExportRequest = {
        export_type: 'ical',
        lease_start_date: getLeaseDate(),
        annual_rent: input.annualRent,
        cheques: input.chequeFreq,
        property_label: `${input.layout.toUpperCase()} in ${input.location}, ${emirateLabel(input.emirate)}`
      };
      await ApiService.exportSchedule(payload);
      setIcsDone(true);
      setTimeout(() => setIcsDone(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to download Calendar');
    } finally {
      setIcsRunning(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setPdfRunning(false);
      setPdfDone(false);
      setIcsRunning(false);
      setIcsDone(false);
      setError(null);
    }, 200);
  };

  return (
    <section className="space-y-4">
      <SectionLabel>D · Workflow Triggers</SectionLabel>

      {/* Primary trigger button with speed-line glow */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden border-2 border-ink bg-ink px-4 py-4 shadow-manga transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
      >
        <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="absolute -left-8 top-1/2 h-px w-12 -translate-y-1/2 bg-gradient-to-r from-transparent to-sunset" />
          <span className="absolute -right-8 top-1/2 h-px w-12 -translate-y-1/2 bg-gradient-to-l from-transparent to-sunset" />
          <span className="absolute left-1/2 -top-6 h-12 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-sunset" />
          <span className="absolute left-1/2 -bottom-6 h-12 w-px -translate-x-1/2 bg-gradient-to-t from-transparent to-sunset" />
        </span>
        <span className="relative flex items-center justify-center gap-2.5">
          <Rocket className="h-5 w-5 text-sunset group-hover:rotate-12 transition-transform" />
          <span className="font-heading text-[13px] font-bold uppercase tracking-[0.16em] text-cream">
            Generate Move-In Cashflow Budget
          </span>
          <span className="font-mono text-[10px] font-bold text-sunset">PDF &amp; CALENDAR</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md"
            >
              <MangaPanel corners className="p-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-ink bg-parchment px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-sunset" />
                    <h3 className="font-heading text-[13px] font-bold uppercase tracking-wider text-ink">
                      Export Center
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-7 w-7 items-center justify-center border-2 border-transparent hover:border-ink hover:bg-ink hover:text-cream transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 border-b-2 border-ink bg-red-100 px-4 py-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="font-body text-[11px] font-bold text-red-600">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-3 bg-parchment-100 p-4">
                  {/* PDF Export */}
                  <div className="border-2 border-ink bg-parchment-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-sunset text-ink">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-heading text-[13px] font-bold uppercase tracking-wider text-ink truncate">
                            Audit PDF Report
                          </p>
                          <p className="font-body text-[10px] text-ink/45 truncate">Cashflow Breakdown</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={pdfRunning}
                        className={[
                          'shrink-0 border-2 border-ink px-3 py-2 font-heading text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5',
                          'shadow-mangaSm transition-transform',
                          !pdfRunning && 'hover:-translate-x-0.5 hover:-translate-y-0.5',
                          pdfRunning ? 'bg-ink/10 text-ink/40 cursor-not-allowed' : pdfDone ? 'bg-emeraldRisk text-cream' : 'bg-sunset text-cream',
                        ].join(' ')}
                      >
                        {pdfRunning ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Fetching
                          </>
                        ) : pdfDone ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Generated
                          </>
                        ) : (
                          'Export'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* .ics calendar */}
                  <div className="border-2 border-ink bg-parchment-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-ink text-cream">
                          <Calendar className="h-4 w-4 text-sunset" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-heading text-[13px] font-bold uppercase tracking-wider text-ink truncate">
                            Calendar Sync
                          </p>
                          <p className="font-body text-[10px] text-ink/45 truncate">.ics · {input.chequeFreq} reminders</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadCalendar}
                        disabled={icsRunning}
                        className={[
                          'shrink-0 flex items-center gap-1.5 border-2 border-ink px-3 py-2 font-heading text-[11px] font-bold uppercase tracking-wider',
                          'shadow-mangaSm transition-transform',
                          !icsRunning && 'hover:-translate-x-0.5 hover:-translate-y-0.5',
                          icsRunning ? 'bg-ink/10 text-ink/40 cursor-not-allowed' : icsDone ? 'bg-emeraldRisk text-cream' : 'bg-sunset text-cream',
                        ].join(' ')}
                      >
                        {icsRunning ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Syncing
                          </>
                        ) : icsDone ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Synced
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" /> Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="px-4 pb-4 font-body text-[10px] text-ink/40 text-center mt-2">
                  Powered by arugamama Serverless API
                </p>
              </MangaPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
