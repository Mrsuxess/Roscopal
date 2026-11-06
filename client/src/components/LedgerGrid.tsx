import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { 
  ShieldCheck, 
  Lock, 
  Download, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Hash,
  Info
} from 'lucide-react';
import { LedgerEntry } from '../types';
import { fetchLedger, verifyLedgerChain } from '../api/client';

interface LedgerGridProps {
  circleId: string;
}

export const LedgerGrid: React.FC<LedgerGridProps> = ({ circleId }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState('');
  const [verification, setVerification] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const gridRef = useRef<AgGridReact>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchLedger(circleId);
      setEntries(res.entries || []);
      const verRes = await verifyLedgerChain(circleId);
      setVerification(verRes);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [circleId]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await verifyLedgerChain(circleId);
      setVerification(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleExportCsv = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `roscopal-audit-ledger-${circleId}.csv`
      });
    }
  }, [circleId]);

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef<LedgerEntry>[]>(() => [
    {
      field: 'entry_index',
      headerName: '#',
      width: 70,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellClass: 'font-mono text-slate-400 font-bold'
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp (UTC)',
      width: 170,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const d = new Date(params.value);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      },
      cellClass: 'font-mono text-xs text-slate-300'
    },
    {
      field: 'event_type',
      headerName: 'Event Type',
      width: 190,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams) => {
        const val = params.value;
        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
        if (val === 'CONTRIBUTION_RECEIVED') badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        else if (val === 'PAYOUT_COMPLETED') badgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        else if (val === 'EXTENSION_GRANTED') badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        else if (val === 'GENESIS') badgeColor = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeColor}`}>
            {val}
          </span>
        );
      }
    },
    {
      field: 'member_name',
      headerName: 'Initiator / Member',
      width: 160,
      sortable: true,
      filter: true,
      cellClass: 'font-semibold text-white'
    },
    {
      field: 'recipient_name',
      headerName: 'Recipient / Target',
      width: 170,
      sortable: true,
      filter: true,
      cellClass: 'text-slate-300'
    },
    {
      field: 'cycle_number',
      headerName: 'Cycle',
      width: 85,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellClass: 'text-center font-mono font-bold text-slate-400'
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => {
        const amt = Number(params.value || 0);
        return (
          <span className="font-mono font-bold text-slate-100">
            ${amt.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">{params.data?.currency || 'USD'}</span>
          </span>
        );
      }
    },
    {
      field: 'payment_status',
      headerName: 'Payment Status',
      width: 150,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams) => (
        <span className="text-[11px] font-semibold text-slate-300">
          {params.value}
        </span>
      )
    },
    {
      field: 'paypal_ref',
      headerName: 'PayPal Reference',
      width: 160,
      sortable: true,
      filter: true,
      cellClass: 'font-mono text-xs text-sky-400'
    },
    {
      field: 'audit_status',
      headerName: 'Audit Status',
      width: 130,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          {params.value || 'VERIFIED'}
        </span>
      )
    },
    {
      field: 'entry_hash',
      headerName: 'Block Hash (SHA-256)',
      width: 150,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => {
        const hash = params.value || '';
        return (
          <button
            onClick={() => setSelectedEntry(params.data)}
            className="flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline"
            title="Inspect full SHA-256 hash payload and previous block link"
          >
            <Hash className="w-3 h-3" />
            <span>{hash.slice(0, 8)}...{hash.slice(-4)}</span>
          </button>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    filter: true,
    sortable: true,
  }), []);

  return (
    <div className="space-y-4">
      {/* Ledger Header & Cryptographic Status Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Lock className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Cryptographic Financial Audit Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Append-only, SHA-256 hash-chained financial record powered by AG Grid. Every contribution, grace exception, and PayPal payout is cryptographically immutable.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all"
            >
              <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Recomputing SHA-256...' : 'Verify Chain Integrity'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Integrity Banner */}
        {verification && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Chain Status:</strong> {verification.message}</span>
            </div>
            {verification.headHash && (
              <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400">
                Head Hash: <span className="text-emerald-400">{verification.headHash.slice(0, 16)}...</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid Controls (Search Quick Filter) */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            placeholder="Search transactions, members, PayPal refs, hashes..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <strong>{entries.length}</strong> recorded blocks
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ag-theme-quartz-dark">
        <AgGridReact
          ref={gridRef}
          rowData={entries}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          rowSelection="single"
          animateRows={true}
          headerHeight={42}
          rowHeight={44}
        />
      </div>

      {/* Block Hash Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Cryptographic Block #{selectedEntry.entry_index}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Block Hash (SHA-256)</span>
                <span className="text-emerald-400 break-all">{selectedEntry.entry_hash}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Previous Block Pointer (Hash-chain)</span>
                <span className="text-sky-400 break-all">{selectedEntry.previous_hash}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-500">Event:</span> {selectedEntry.event_type}</div>
                <div><span className="text-slate-500">Member:</span> {selectedEntry.member_name}</div>
                <div><span className="text-slate-500">Amount:</span> ${selectedEntry.amount} {selectedEntry.currency}</div>
                <div><span className="text-slate-500">PayPal Ref:</span> {selectedEntry.paypal_ref}</div>
                <div><span className="text-slate-500">Cycle:</span> #{selectedEntry.cycle_number}</div>
                <div><span className="text-slate-500">Status:</span> {selectedEntry.payment_status}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Raw Block Metadata</span>
                <pre className="overflow-x-auto whitespace-pre-wrap">{selectedEntry.metadata_json}</pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
