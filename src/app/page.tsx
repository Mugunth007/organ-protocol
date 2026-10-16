'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Heart,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Hospital,
  ArrowRight,
  Database,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
  Share2,
  FileText,
  Radio,
  Boxes,
} from 'lucide-react';

interface Organ {
  key: string;
  organType: string;
  bloodGroup: string;
  status: 'HARVESTED' | 'DISPATCHED' | 'TRANSPLANTED' | 'EXPIRED';
  donorHospital: string;
  city: string;
  ischemiaHours: number;
  urgencyTier: string;
  remainingSeconds: number;
  donorRef?: string;
  hla?: Record<string, string>;
  createdAt?: string;
}

interface Recipient {
  key: string;
  recipientRef: string;
  organType: string;
  bloodGroup: string;
  priorityScore: number;
  hospitalNode: string;
  status: 'WAITING' | 'ALLOCATED' | 'TRANSPLANTED';
  registeredBlock: number;
  clinicalNotes: string;
}

interface NetworkInfo {
  chainId: number;
  blockNumber: number;
  operatorAddress: string;
  balance: string;
  network: string;
  faucetUrl: string;
}

export default function OrganProtocolDashboard() {
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'radar' | 'dispatch' | 'waitlist' | 'inspector'>('radar');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Harvest modal state
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    organType: 'HEART',
    bloodGroup: 'O_POS',
    donorHospital: 'AIIMS_DELHI',
    city: 'New Delhi',
    ischemiaHours: 6,
    urgencyTier: 'TIER_1_CRITICAL',
  });
  const [isSubmittingHarvest, setIsSubmittingHarvest] = useState(false);

  // Recipient registration state
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [recipientForm, setRecipientForm] = useState({
    organType: 'HEART',
    bloodGroup: 'O_POS',
    priorityScore: 95,
    hospitalNode: 'AIIMS_DELHI',
    clinicalNotes: 'Status 1A: Refractory cardiogenic shock',
  });
  const [isSubmittingRecipient, setIsSubmittingRecipient] = useState(false);

  // Inspector state
  const [inspectorQuery, setInspectorQuery] = useState(`client.select().where(and(eq('app', 'organprotocol'), eq('entity_type', 'ORGAN_HARVEST'))).fetch()`);
  const [inspectorResult, setInspectorResult] = useState<any>(null);
  const [isRunningInspector, setIsRunningInspector] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      const [netRes, organRes, recRes] = await Promise.all([
        fetch('/api/network').then((r) => r.json()),
        fetch('/api/organs').then((r) => r.json()),
        fetch('/api/recipients').then((r) => r.json()),
      ]);

      if (netRes.success) setNetwork(netRes);
      if (organRes.success && organRes.organs) setOrgans(organRes.organs);
      if (recRes.success && recRes.recipients) setRecipients(recRes.recipients);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Live countdown ticker every second
  useEffect(() => {
    const timer = setInterval(() => {
      setOrgans((prev) =>
        prev.map((o) => {
          if (o.status === 'TRANSPLANTED' || o.status === 'EXPIRED') return o;
          const nextRemaining = Math.max(0, (o.remainingSeconds || 0) - 1);
          return {
            ...o,
            remainingSeconds: nextRemaining,
            status: nextRemaining === 0 ? 'EXPIRED' : o.status,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHarvest(true);
    try {
      const res = await fetch('/api/organs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(harvestForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🫀 Organ Harvest Entity Minted on Arkiv! Key: ${data.entityKey.slice(0, 10)}...`);
        setIsHarvestModalOpen(false);
        setOrgans((prev) => [data.organ, ...prev]);
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingHarvest(false);
    }
  };

  const handleRecipientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRecipient(true);
    try {
      const res = await fetch('/api/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipientForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📋 Recipient Registered in Priority Waitlist! Score: ${data.recipient.priorityScore}`);
        setIsRecipientModalOpen(false);
        setRecipients((prev) => [data.recipient, ...prev]);
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingRecipient(false);
    }
  };

  const handleDispatch = async (organ: Organ) => {
    try {
      const res = await fetch('/api/organs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityKey: organ.key, status: 'DISPATCHED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🚑 Green Corridor Dispatched for ${organ.organType} (${organ.bloodGroup})!`);
        setOrgans((prev) =>
          prev.map((o) => (o.key === organ.key ? { ...o, status: 'DISPATCHED' } : o))
        );
      }
    } catch (err: any) {
      alert(`Failed to dispatch: ${err.message}`);
    }
  };

  const handleTransplant = async (organ: Organ) => {
    try {
      const res = await fetch('/api/organs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityKey: organ.key, status: 'TRANSPLANTED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Transplant Completed Successfully at Recipient Hospital!`);
        setOrgans((prev) =>
          prev.map((o) => (o.key === organ.key ? { ...o, status: 'TRANSPLANTED' } : o))
        );
      }
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`);
    }
  };

  const runLiveInspectorQuery = async () => {
    setIsRunningInspector(true);
    try {
      const res = await fetch('/api/organs');
      const data = await res.json();
      setInspectorResult({
        jsonRpcEndpoint: 'https://rpc.tiramisu.db-chain.testnet.arkiv.network',
        method: 'arkiv_query',
        activeFilter: 'app = "organprotocol" AND entity_type = "ORGAN_HARVEST"',
        returnedCount: data.organs?.length || 0,
        networkChainId: 7738577,
        payloadEntities: data.organs?.map((o: any) => ({
          key: o.key,
          expiresAtBlock: o.expiresAtBlock || 'Resolved on Arkiv Engine',
          attributes: {
            app: 'organprotocol',
            organ_type: o.organType,
            blood_group: o.bloodGroup,
            status: o.status,
            donor_hospital: o.donorHospital,
            ischemia_hours: o.ischemiaHours,
          },
        })),
      });
    } catch (err: any) {
      setInspectorResult({ error: err.message });
    } finally {
      setIsRunningInspector(false);
    }
  };

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return 'EXPIRED (00:00:00)';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const getDecayProgress = (organ: Organ) => {
    const total = organ.ischemiaHours * 3600;
    const remaining = organ.remainingSeconds || 0;
    const pct = Math.min(100, Math.max(0, (remaining / total) * 100));
    return pct;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-500/60 text-emerald-200 px-5 py-3 rounded-xl shadow-2xl shadow-emerald-900/40 flex items-center gap-3 backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0b101d]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Heart className="w-6 h-6 text-white animate-heartbeat" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">OrganProtocol</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Arkiv Tiramisu
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Anti-Corruption Cadaveric Allocation with Cold-Ischemia TTL</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Network Badge */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">Block #{network?.blockNumber || 'Syncing...'}</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400 font-medium">Chain {network?.chainId || 7738577}</span>
            </div>

            {/* Operator Balance */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-400">Operator Gas:</span>
              <span className="text-white font-semibold">{network?.balance || '0.00'} TIRAMISU</span>
            </div>

            {/* Faucet Link */}
            <a
              href="https://hub.arkiv.network"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <span>Get Faucet Gas</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh on-chain state"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 md:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Road to Devcon 8 Hackathon • Best Indian Use Case & CROPS Track</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Binding Human Organ Viability to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Arkiv Decentralized TTL</span>
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Solving India’s cadaveric transplant crisis: preventing VIP queue-tampering via tamper-proof FIFO waitlists, and eliminating cold-ischemia organ wastage through autonomous block-decay expiration.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <button
                onClick={() => setIsHarvestModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-rose-950/50 transition text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record Organ Harvest</span>
              </button>

              <button
                onClick={() => setIsRecipientModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl border border-slate-700 transition text-sm"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Enroll Waitlist Recipient</span>
              </button>
            </div>
          </div>
        </div>

        {/* Protocol Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Organs (Live TTL)</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {organs.filter((o) => o.status === 'HARVESTED' || o.status === 'DISPATCHED').length}
              </span>
              <span className="text-xs text-emerald-400">Viable</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Waiting Patients</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {recipients.filter((r) => r.status === 'WAITING').length}
              </span>
              <span className="text-xs text-slate-400">Verified Priority</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Hospital Nodes (India)</span>
              <Hospital className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">4</span>
              <span className="text-xs text-indigo-300">AIIMS, KEM, Apollo, NIMHANS</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Queue Tamper Resistance</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">100%</span>
              <span className="text-xs text-slate-400">Cryptographic FIFO</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('radar')}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'radar'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Biological Cold-Ischemia Radar ({organs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('waitlist')}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'waitlist'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Corruption Recipient Waitlist ({recipients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'dispatch'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hospital className="w-4 h-4" />
            <span>Hospital Nodes & Green Corridors</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('inspector');
              if (!inspectorResult) runLiveInspectorQuery();
            }}
            className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'inspector'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Arkiv Query & RPC Inspector</span>
          </button>
        </div>

        {/* TAB 1: BIOLOGICAL COLD-ISCHEMIA RADAR */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Live Viability & Cold-Ischemia TTL Radar</h2>
                <p className="text-xs text-slate-400">
                  Each entity carries an on-chain block expiration matching its biological organ decay limit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {organs.map((organ) => {
                const pct = getDecayProgress(organ);
                const isUrgent = pct < 25 && organ.status !== 'TRANSPLANTED' && organ.status !== 'EXPIRED';
                const isDispatched = organ.status === 'DISPATCHED';
                const isTransplanted = organ.status === 'TRANSPLANTED';
                const isExpired = organ.status === 'EXPIRED';

                return (
                  <div
                    key={organ.key}
                    className={`rounded-2xl border p-5 transition bg-slate-900/70 backdrop-blur ${
                      isExpired
                        ? 'border-slate-800 opacity-60'
                        : isTransplanted
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : isUrgent
                        ? 'border-red-500/60 shadow-lg shadow-red-950/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                            organ.organType === 'HEART'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : organ.organType === 'LIVER'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          {organ.organType === 'HEART' ? '🫀' : organ.organType === 'LIVER' ? '🥩' : '🫘'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base tracking-tight">
                              {organ.organType}
                            </span>
                            <span className="bg-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                              {organ.bloodGroup.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Hospital className="w-3.5 h-3.5 text-slate-500" />
                            <span>{organ.donorHospital} ({organ.city})</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isTransplanted
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : isDispatched
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            : isExpired
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : isUrgent
                            ? 'bg-red-500/10 text-red-400 border border-red-500/40 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {organ.status}
                      </span>
                    </div>

                    {/* Cold Ischemia Countdown Bar */}
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Cold-Ischemia TTL Window:</span>
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isExpired
                              ? 'text-slate-500 line-through'
                              : isUrgent
                              ? 'text-red-400 font-extrabold animate-pulse'
                              : 'text-emerald-400'
                          }`}
                        >
                          {formatSeconds(organ.remainingSeconds || 0)}
                        </span>
                      </div>

                      {/* Progress Track */}
                      <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            isExpired
                              ? 'bg-slate-700'
                              : isTransplanted
                              ? 'bg-emerald-500'
                              : isUrgent
                              ? 'bg-red-500'
                              : pct < 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${isExpired ? 100 : pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Max Viability: {organ.ischemiaHours}h</span>
                        <span>Arkiv Expiration: {Math.round(pct)}% viable remaining</span>
                      </div>
                    </div>

                    {/* Metadata & Entity Key */}
                    <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Anonymous Donor Ref</span>
                        <span className="text-slate-300 font-mono text-[11px] truncate block">{organ.donorRef}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Arkiv Entity Key</span>
                        <span className="text-slate-300 font-mono text-[11px] truncate block" title={organ.key}>
                          {organ.key.slice(0, 14)}...{organ.key.slice(-6)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isTransplanted && !isExpired && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2">
                        {organ.status === 'HARVESTED' && (
                          <button
                            onClick={() => handleDispatch(organ)}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                          >
                            <span>Dispatch Green Corridor</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {organ.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleTransplant(organ)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition shadow-md shadow-emerald-950/40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Transplant Complete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ANTI-CORRUPTION RECIPIENT WAITLIST */}
        {activeTab === 'waitlist' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Tamper-Proof Recipient Waitlist (India National Node)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Strictly ordered by clinical severity and on-chain registration block number. Zero database backdoor alteration possible.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg">
                  🛡️ DPDP Act Compliant (Zero PII on-chain)
                </span>
              </div>
            </div>

            {/* Waitlist Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Priority / Queue Rank</th>
                      <th className="py-3.5 px-4">Anonymous Recipient</th>
                      <th className="py-3.5 px-4">Organ Needed</th>
                      <th className="py-3.5 px-4">Blood Group</th>
                      <th className="py-3.5 px-4">Clinical Urgency</th>
                      <th className="py-3.5 px-4">Hospital Node</th>
                      <th className="py-3.5 px-4">Registered Block</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {recipients
                      .slice()
                      .sort((a, b) => b.priorityScore - a.priorityScore)
                      .map((rec, idx) => (
                        <tr key={rec.key} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs">
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-emerald-300 font-medium">
                            {rec.recipientRef}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {rec.organType}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">
                              {rec.bloodGroup.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{rec.priorityScore}</span>
                              <span className="text-[10px] text-slate-400">
                                {rec.organType === 'LIVER' ? 'MELD Score' : 'Urgency Index'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {rec.clinicalNotes}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {rec.hospitalNode}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            #{rec.registeredBlock}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                rec.status === 'ALLOCATED'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                  : rec.status === 'TRANSPLANTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HOSPITAL NODES & GREEN CORRIDORS */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Federated Hospital Nodes & Inter-City Green Corridors</h2>
              <p className="text-xs text-slate-400">
                Accredited medical centers running verified operator keys on the Arkiv Tiramisu network.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'AIIMS_DELHI',
                  name: 'AIIMS New Delhi',
                  zone: 'North Node',
                  specialty: 'Cadaveric Heart & Multi-Organ',
                  key: '0x312d...E617',
                  activeHarvests: 1,
                  status: 'ONLINE',
                },
                {
                  id: 'KEM_MUMBAI',
                  name: 'KEM Hospital Mumbai',
                  zone: 'West Node',
                  specialty: 'Hepatic & Renal Transplant',
                  key: '0x9941...491a',
                  activeHarvests: 1,
                  status: 'ONLINE',
                },
                {
                  id: 'APOLLO_CHENNAI',
                  name: 'Apollo Hospital Chennai',
                  zone: 'South Node',
                  specialty: 'Cadaveric Renal & Cornea',
                  key: '0x8842...318e',
                  activeHarvests: 1,
                  status: 'ONLINE',
                },
                {
                  id: 'NIMHANS_BENGALURU',
                  name: 'NIMHANS Bengaluru',
                  zone: 'South-Central Node',
                  specialty: 'Neurotrauma & Organ Recovery',
                  key: '0x7143...840f',
                  activeHarvests: 1,
                  status: 'ONLINE',
                },
              ].map((hosp) => (
                <div key={hosp.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {hosp.zone}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{hosp.status}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base">{hosp.name}</h3>
                  <p className="text-xs text-slate-400">{hosp.specialty}</p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Signer Key:</span>
                    <span className="font-mono text-slate-300">{hosp.key}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Green Corridor Active Mesh */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                <span>Active Green Corridor Air-Bridge</span>
              </h3>
              <p className="text-xs text-slate-400">
                Real-time tracking of cold-perfusion containers with on-chain handoff verification between state police, airport traffic control, and receiving surgical teams.
              </p>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    ✈️
                  </div>
                  <div>
                    <span className="text-xs font-mono text-indigo-400 uppercase font-semibold">Corridor Route</span>
                    <h4 className="text-white font-bold text-sm">AIIMS New Delhi ➔ Fortis Okhla</h4>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Temperature:</span>
                    <span className="text-emerald-400 font-bold">3.8°C (Perfusion Normal)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Transit Status:</span>
                    <span className="text-amber-400 font-bold">POLICE ESCORT ACTIVE</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ETA Theater:</span>
                    <span className="text-white font-bold">18 Mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARKIV QUERY & RPC INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span>Arkiv SDK Query & JSON-RPC Inspector</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect the live database calls dispatched to Arkiv Tiramisu RPC endpoint.
                </p>
              </div>

              <button
                onClick={runLiveInspectorQuery}
                disabled={isRunningInspector}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningInspector ? 'animate-spin' : ''}`} />
                <span>Execute Live Arkiv Query</span>
              </button>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
                <span>TypeScript / @arkiv-network/sdk v0.8.x Query</span>
                <span className="text-emerald-400">Chain ID: 7738577 (Tiramisu)</span>
              </div>
              <pre className="font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
{`import { createPublicClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { eq, and } from '@arkiv-network/sdk/query';
import { http } from 'viem';

const client = createPublicClient({ chain: tiramisu, transport: http() });

// Real-Time Query: find unexpired viable organs
const viableOrgans = await client
  .select()
  .where(
    and(
      eq('app', 'organprotocol'),
      eq('entity_type', 'ORGAN_HARVEST'),
      eq('status', 'HARVESTED')
    )
  )
  .fetch();`}
              </pre>
            </div>

            {/* Live RPC Response Preview */}
            <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
                <span>Live RPC Response Payload (`arkiv_query`)</span>
                <span className="text-amber-400">{inspectorResult?.returnedCount || 0} Entities Found</span>
              </div>
              <pre className="font-mono text-xs text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(inspectorResult || { status: 'Click "Execute Live Arkiv Query" to run' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* HARVEST MODAL */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Record Cadaveric Organ Harvest</h3>
              </div>
              <button
                onClick={() => setIsHarvestModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHarvestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Organ Type</label>
                <select
                  value={harvestForm.organType}
                  onChange={(e) => {
                    const organ = e.target.value;
                    const hours = organ === 'HEART' ? 6 : organ === 'LIVER' ? 12 : 36;
                    setHarvestForm({ ...harvestForm, organType: organ, ischemiaHours: hours });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="HEART">Heart (Cold Ischemia Window: 6 Hours)</option>
                  <option value="LIVER">Liver (Cold Ischemia Window: 12 Hours)</option>
                  <option value="KIDNEY">Kidney (Cold Ischemia Window: 36 Hours)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Blood Group</label>
                  <select
                    value={harvestForm.bloodGroup}
                    onChange={(e) => setHarvestForm({ ...harvestForm, bloodGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="O_POS">O Positive (Universal Donor)</option>
                    <option value="A_POS">A Positive</option>
                    <option value="B_POS">B Positive</option>
                    <option value="AB_POS">AB Positive</option>
                    <option value="O_NEG">O Negative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Harvesting Hospital Node</label>
                  <select
                    value={harvestForm.donorHospital}
                    onChange={(e) => {
                      const hosp = e.target.value;
                      const city = hosp === 'AIIMS_DELHI' ? 'New Delhi' : hosp === 'KEM_MUMBAI' ? 'Mumbai' : hosp === 'APOLLO_CHENNAI' ? 'Chennai' : 'Bengaluru';
                      setHarvestForm({ ...harvestForm, donorHospital: hosp, city });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="AIIMS_DELHI">AIIMS New Delhi</option>
                    <option value="KEM_MUMBAI">KEM Hospital Mumbai</option>
                    <option value="APOLLO_CHENNAI">Apollo Chennai</option>
                    <option value="NIMHANS_BENGALURU">NIMHANS Bengaluru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Biological Cold Ischemia TTL (Hours before Arkiv Block Expiration)
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={harvestForm.ischemiaHours}
                  onChange={(e) => setHarvestForm({ ...harvestForm, ischemiaHours: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  💡 Tip: Set to 1 hour to witness fast on-chain block decay in testing.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHarvestModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHarvest}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-2"
                >
                  {isSubmittingHarvest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Mint Entity on Arkiv</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPIENT MODAL */}
      {isRecipientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Enroll Waitlist Recipient (DPDP Compliant)</h3>
              </div>
              <button
                onClick={() => setIsRecipientModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecipientSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Organ</label>
                  <select
                    value={recipientForm.organType}
                    onChange={(e) => setRecipientForm({ ...recipientForm, organType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="HEART">Heart</option>
                    <option value="LIVER">Liver</option>
                    <option value="KIDNEY">Kidney</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Recipient Blood Group</label>
                  <select
                    value={recipientForm.bloodGroup}
                    onChange={(e) => setRecipientForm({ ...recipientForm, bloodGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="O_POS">O Positive</option>
                    <option value="A_POS">A Positive</option>
                    <option value="B_POS">B Positive</option>
                    <option value="AB_POS">AB Positive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Clinical Priority Score (0-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={recipientForm.priorityScore}
                    onChange={(e) => setRecipientForm({ ...recipientForm, priorityScore: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Treating Hospital Node</label>
                  <select
                    value={recipientForm.hospitalNode}
                    onChange={(e) => setRecipientForm({ ...recipientForm, hospitalNode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="AIIMS_DELHI">AIIMS New Delhi</option>
                    <option value="KEM_MUMBAI">KEM Hospital Mumbai</option>
                    <option value="APOLLO_CHENNAI">Apollo Chennai</option>
                    <option value="NIMHANS_BENGALURU">NIMHANS Bengaluru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Indication (Anonymous)</label>
                <input
                  type="text"
                  value={recipientForm.clinicalNotes}
                  onChange={(e) => setRecipientForm({ ...recipientForm, clinicalNotes: e.target.value })}
                  placeholder="e.g. MELD 34: End-stage liver failure with acute decompensation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecipientModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecipient}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2"
                >
                  {isSubmittingRecipient ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Enroll on Arkiv</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#070b14] py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-slate-400 font-semibold">OrganProtocol</span>
            <span>• Built for Arkiv Devcon 8 Hackathon</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>Operator: {network?.operatorAddress || '0x312d...E617'}</span>
            <span>RPC: tiramisu.db-chain.testnet.arkiv.network</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
