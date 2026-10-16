'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Clock,
  ShieldCheck,
  Hospital,
  ArrowRight,
  Database,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Radio,
  Boxes,
  Sparkles,
  Copy,
  ChevronRight,
  Flame,
  Activity,
  Layers,
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

export default function OrganProtocolAceternityDashboard() {
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'radar' | 'waitlist' | 'dispatch' | 'inspector'>('radar');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    priorityScore: 96,
    hospitalNode: 'AIIMS_DELHI',
    clinicalNotes: 'Status 1A: Refractory biventricular decompensation',
  });
  const [isSubmittingRecipient, setIsSubmittingRecipient] = useState(false);

  // Inspector state
  const [inspectorResult, setInspectorResult] = useState<any>(null);
  const [isRunningInspector, setIsRunningInspector] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
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
        showToast(`Organ Harvest Entity Minted on Arkiv! Key: ${data.entityKey.slice(0, 12)}...`);
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
        showToast(`Recipient Enrolled in Priority Waitlist! Score: ${data.recipient.priorityScore}`);
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
        showToast(`Green Corridor Air-Bridge Dispatched for ${organ.organType} (${organ.bloodGroup})!`);
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
        showToast(`Transplant Completed Successfully at Recipient Surgical Suite!`);
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
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDecayProgress = (organ: Organ) => {
    const total = organ.ischemiaHours * 3600;
    const remaining = organ.remainingSeconds || 0;
    return Math.min(100, Math.max(0, (remaining / total) * 100));
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-neutral-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300 font-sans">
      {/* Background Grids & Ambient Lights (Aceternity Style) */}
      <div className="absolute inset-0 aceternity-grid mask-radial-faded pointer-events-none" />
      <div className="absolute top-[-8rem] left-1/2 -translate-x-1/2 w-[650px] h-[340px] bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent blur-[110px] pointer-events-none" />
      <div className="absolute top-[20rem] right-[5%] w-[420px] h-[320px] bg-indigo-500/10 blur-[130px] pointer-events-none" />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 aceternity-card !bg-neutral-900/90 !border-emerald-500/40 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-2xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium text-xs tracking-tight">{notification}</span>
        </div>
      )}

      {/* Floating Pill Header */}
      <header className="sticky top-4 z-40 px-4 max-w-7xl mx-auto w-full">
        <div className="aceternity-card rounded-full px-5 py-3 flex items-center justify-between border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full p-[1px] overflow-hidden flex items-center justify-center bg-gradient-to-tr from-rose-500 to-amber-500">
              <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center">
                <Heart className="w-4 h-4 text-rose-500 animate-heartbeat" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tighter text-white">OrganProtocol</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Arkiv Tiramisu
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Block Pill */}
            <div className="flex items-center gap-2 bg-neutral-950/80 border border-white/[0.06] px-3 py-1.5 rounded-full text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-neutral-300">Block #{network?.blockNumber || 'Syncing...'}</span>
              <span className="text-neutral-600">/</span>
              <span className="text-amber-400">7738577</span>
            </div>

            {/* Operator Balance */}
            <div className="hidden md:flex items-center gap-2 bg-neutral-950/80 border border-white/[0.06] px-3.5 py-1.5 rounded-full text-[11px] font-mono">
              <span className="text-neutral-400">Gas:</span>
              <span className="text-emerald-400 font-semibold">{network?.balance || '0.00'} TIRAMISU</span>
            </div>

            {/* Faucet Link */}
            <a
              href="https://hub.arkiv.network"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 rounded-full transition"
            >
              <span>Faucet</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 transition"
              title="Refresh Network State"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Aceternity Hero Section */}
        <div className="relative text-center max-w-3xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-xs text-neutral-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Road to Devcon 8 Mumbai • Best Indian Use Case & CROPS Track</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400 leading-[1.1]">
            Cold-Ischemia Organ Decay on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Arkiv Native TTL
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
            Eliminating VIP waitlist corruption in Indian cadaveric transplants with immutable cryptographic FIFO ordering, and preventing biological organ wastage through autonomous block-decay expiration.
          </p>

          {/* Action Shimmer Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {/* Shimmer Button 1: Harvest */}
            <button
              onClick={() => setIsHarvestModalOpen(true)}
              className="relative inline-flex h-11 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <span className="absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#047857_50%,#10b981_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-neutral-950 px-6 py-1 text-xs font-semibold text-white backdrop-blur-3xl gap-2 hover:bg-neutral-900 transition">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Record Organ Harvest</span>
              </span>
            </button>

            {/* Shimmer Button 2: Recipient */}
            <button
              onClick={() => setIsRecipientModalOpen(true)}
              className="relative inline-flex h-11 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <span className="absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#6366f1_0%,#1e1b4b_50%,#6366f1_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-neutral-950 px-6 py-1 text-xs font-semibold text-neutral-200 backdrop-blur-3xl gap-2 hover:bg-neutral-900 transition">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Enroll Waitlist Recipient</span>
              </span>
            </button>
          </div>
        </div>

        {/* Aceternity Bento Grid Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="aceternity-card rounded-2xl p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Active Harvests</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-white">
                {organs.filter((o) => o.status === 'HARVESTED' || o.status === 'DISPATCHED').length}
              </div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">Live Biological Countdown</p>
            </div>
          </div>

          <div className="aceternity-card rounded-2xl p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Priority Waitlist</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-white">
                {recipients.filter((r) => r.status === 'WAITING').length}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium mt-1">DPDP Act Compliant (Zero PII)</p>
            </div>
          </div>

          <div className="aceternity-card rounded-2xl p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Federated Nodes</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Hospital className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-white">4</div>
              <p className="text-[11px] text-neutral-400 font-medium mt-1">AIIMS, KEM, Apollo, NIMHANS</p>
            </div>
          </div>

          <div className="aceternity-card rounded-2xl p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Queue Tamper Proof</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight text-emerald-400">100%</div>
              <p className="text-[11px] text-neutral-400 font-medium mt-1">Cryptographic FIFO</p>
            </div>
          </div>
        </div>

        {/* Aceternity Pill Segmented Control Tabs */}
        <div className="flex justify-center">
          <div className="aceternity-card !rounded-full p-1.5 flex items-center gap-1 border border-white/[0.08] shadow-lg">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight transition flex items-center gap-2 ${
                activeTab === 'radar'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cold-Ischemia Radar ({organs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('waitlist')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight transition flex items-center gap-2 ${
                activeTab === 'waitlist'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Waitlist Integrity ({recipients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight transition flex items-center gap-2 ${
                activeTab === 'dispatch'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Hospital className="w-3.5 h-3.5 text-amber-400" />
              <span>Hospital Nodes</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('inspector');
                if (!inspectorResult) runLiveInspectorQuery();
              }}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-tight transition flex items-center gap-2 ${
                activeTab === 'inspector'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Arkiv Inspector</span>
            </button>
          </div>
        </div>

        {/* TAB 1: COLD-ISCHEMIA RADAR */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <span>Biological Cold-Ischemia Viability Radar</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Real-time organ preservation countdowns tied directly to Arkiv block-decay expiration.
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
                    className={`aceternity-card rounded-3xl p-6 relative overflow-hidden group ${
                      isExpired
                        ? 'opacity-50 !border-white/[0.04]'
                        : isTransplanted
                        ? '!border-emerald-500/30'
                        : isUrgent
                        ? '!border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                        : ''
                    }`}
                  >
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold border ${
                            organ.organType === 'HEART'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : organ.organType === 'LIVER'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}
                        >
                          {organ.organType === 'HEART' ? '🫀' : organ.organType === 'LIVER' ? '🥩' : '🫘'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base tracking-tight">
                              {organ.organType}
                            </span>
                            <span className="bg-white/[0.05] border border-white/10 text-neutral-200 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold">
                              {organ.bloodGroup.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 font-normal">
                            <Hospital className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{organ.donorHospital} ({organ.city})</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isTransplanted
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : isDispatched
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            : isExpired
                            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                            : isUrgent
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {organ.status}
                      </span>
                    </div>

                    {/* Cold Ischemia Countdown Meter */}
                    <div className="mt-6 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Cold-Ischemia Time Remaining:</span>
                        </span>
                        <span
                          className={`font-mono font-bold tracking-tight ${
                            isExpired
                              ? 'text-neutral-500 line-through'
                              : isUrgent
                              ? 'text-rose-400 font-extrabold animate-pulse'
                              : 'text-emerald-400'
                          }`}
                        >
                          {formatSeconds(organ.remainingSeconds || 0)}
                        </span>
                      </div>

                      {/* Progress Track */}
                      <div className="w-full bg-neutral-900/80 h-2 rounded-full overflow-hidden border border-white/[0.04]">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            isExpired
                              ? 'bg-neutral-700'
                              : isTransplanted
                              ? 'bg-emerald-500'
                              : isUrgent
                              ? 'bg-rose-500'
                              : pct < 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${isExpired ? 100 : pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                        <span>Max Viability: {organ.ischemiaHours}h</span>
                        <span>{Math.round(pct)}% Viable Life</span>
                      </div>
                    </div>

                    {/* Metadata & Copyable Key */}
                    <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-sans">Anonymous Donor Ref</span>
                        <span className="text-neutral-300 text-[11px] truncate block font-medium">{organ.donorRef}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase font-sans">Arkiv Entity Key</span>
                        <button
                          onClick={() => copyToClipboard(organ.key, organ.key)}
                          className="flex items-center gap-1.5 text-neutral-300 text-[11px] hover:text-white transition group/btn"
                        >
                          <span className="truncate max-w-[130px]">{organ.key.slice(0, 10)}...{organ.key.slice(-4)}</span>
                          <Copy className="w-3 h-3 text-neutral-500 group-hover/btn:text-neutral-300" />
                          {copiedKey === organ.key && <span className="text-[10px] text-emerald-400">Copied!</span>}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isTransplanted && !isExpired && (
                      <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
                        {organ.status === 'HARVESTED' && (
                          <button
                            onClick={() => handleDispatch(organ)}
                            className="inline-flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-950/40"
                          >
                            <span>Dispatch Green Corridor</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {organ.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleTransplant(organ)}
                            className="inline-flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-950/40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Completed Transplant</span>
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

        {/* TAB 2: WAITLIST INTEGRITY */}
        {activeTab === 'waitlist' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>Tamper-Proof Recipient Waitlist (India National Node)</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ordered deterministically by clinical severity score and on-chain registration block number.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero PII On-Chain (DPDP Compliant)</span>
              </span>
            </div>

            <div className="aceternity-card rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-neutral-400 font-mono uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="py-4 px-5">Priority Rank</th>
                      <th className="py-4 px-5">Anonymous Patient Ref</th>
                      <th className="py-4 px-5">Target Organ</th>
                      <th className="py-4 px-5">Blood Group</th>
                      <th className="py-4 px-5">Clinical Score</th>
                      <th className="py-4 px-5">Treating Hospital</th>
                      <th className="py-4 px-5">Registered Block</th>
                      <th className="py-4 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-neutral-300">
                    {recipients
                      .slice()
                      .sort((a, b) => b.priorityScore - a.priorityScore)
                      .map((rec, idx) => (
                        <tr key={rec.key} className="hover:bg-white/[0.02] transition duration-200">
                          <td className="py-4 px-5 font-mono font-bold text-white">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.05] border border-white/10 text-emerald-400 text-xs">
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono text-emerald-300 font-medium">
                            {rec.recipientRef}
                          </td>
                          <td className="py-4 px-5 font-semibold text-white">
                            {rec.organType}
                          </td>
                          <td className="py-4 px-5 font-mono">
                            <span className="bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded text-neutral-200 text-[11px]">
                              {rec.bloodGroup.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{rec.priorityScore}</span>
                              <span className="text-[10px] text-neutral-400">
                                {rec.organType === 'LIVER' ? 'MELD Score' : 'Urgency Index'}
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 block truncate max-w-xs mt-0.5">
                              {rec.clinicalNotes}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-neutral-300 font-medium">
                            {rec.hospitalNode}
                          </td>
                          <td className="py-4 px-5 font-mono text-neutral-400">
                            #{rec.registeredBlock}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                                rec.status === 'ALLOCATED'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  : rec.status === 'TRANSPLANTED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-white/[0.05] text-neutral-300 border border-white/10'
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

        {/* TAB 3: HOSPITAL NODES & GREEN CORRIDOR */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Hospital className="w-5 h-5 text-amber-400" />
                <span>Federated Hospital Nodes & Inter-City Green Corridors</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Accredited Indian medical centers running verified operator keys on the Arkiv Tiramisu network.
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
                  status: 'ONLINE',
                },
                {
                  id: 'KEM_MUMBAI',
                  name: 'KEM Hospital Mumbai',
                  zone: 'West Node',
                  specialty: 'Hepatic & Renal Transplant',
                  key: '0x9941...491a',
                  status: 'ONLINE',
                },
                {
                  id: 'APOLLO_CHENNAI',
                  name: 'Apollo Hospital Chennai',
                  zone: 'South Node',
                  specialty: 'Cadaveric Renal & Cornea',
                  key: '0x8842...318e',
                  status: 'ONLINE',
                },
                {
                  id: 'NIMHANS_BENGALURU',
                  name: 'NIMHANS Bengaluru',
                  zone: 'South-Central Node',
                  specialty: 'Neurotrauma & Recovery',
                  key: '0x7143...840f',
                  status: 'ONLINE',
                },
              ].map((hosp) => (
                <div key={hosp.id} className="aceternity-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {hosp.zone}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{hosp.status}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base tracking-tight">{hosp.name}</h3>
                  <p className="text-xs text-neutral-400">{hosp.specialty}</p>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-sans">Node Signer:</span>
                    <span className="font-mono text-neutral-300 text-[11px]">{hosp.key}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Green Corridor */}
            <div className="aceternity-card rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                <span>Active Green Corridor Air-Bridge</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Real-time tracking of cold-perfusion containers with on-chain handoff verification between state police, airport traffic control, and receiving surgical teams.
              </p>

              <div className="bg-neutral-950/70 border border-white/[0.06] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                    ✈️
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Active Air Corridor</span>
                    <h4 className="text-white font-bold text-sm tracking-tight">AIIMS New Delhi ➔ Fortis Okhla</h4>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-xs font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Perfusion Temp:</span>
                    <span className="text-emerald-400 font-bold">3.8°C (Normal)</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Transit Status:</span>
                    <span className="text-amber-400 font-bold">POLICE ESCORT</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">ETA Theater:</span>
                    <span className="text-white font-bold">18 Mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARKIV INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>Arkiv SDK Query & JSON-RPC Inspector</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Inspect the live database calls dispatched to Arkiv Tiramisu RPC endpoint.
                </p>
              </div>

              <button
                onClick={runLiveInspectorQuery}
                disabled={isRunningInspector}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-lg shadow-emerald-950/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningInspector ? 'animate-spin' : ''}`} />
                <span>Execute Live Arkiv Query</span>
              </button>
            </div>

            {/* Code Snippet Box */}
            <div className="aceternity-card rounded-3xl p-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-white/[0.06]">
                <span>TypeScript / @arkiv-network/sdk v0.8.x Query</span>
                <span className="text-emerald-400">Chain ID: 7738577 (Tiramisu)</span>
              </div>
              <pre className="text-emerald-300 overflow-x-auto leading-relaxed p-2">
{`import { createPublicClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { eq, and } from '@arkiv-network/sdk/query';
import { http } from 'viem';

const client = createPublicClient({ chain: tiramisu, transport: http() });

// Real-Time Arkiv Query: find viable organs before block expiration
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

            {/* Live RPC Response Payload */}
            <div className="aceternity-card rounded-3xl p-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-white/[0.06]">
                <span>Live RPC Response Payload (`arkiv_query`)</span>
                <span className="text-amber-400 font-semibold">{inspectorResult?.returnedCount || 0} Entities Found</span>
              </div>
              <pre className="text-neutral-300 overflow-x-auto max-h-96 leading-relaxed p-2">
                {JSON.stringify(inspectorResult || { status: 'Click "Execute Live Arkiv Query" to run' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* HARVEST MODAL (Aceternity Glass Dialog) */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="aceternity-card !bg-neutral-950/95 !border-white/[0.12] rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Record Cadaveric Organ Harvest</h3>
                  <p className="text-xs text-neutral-400">Mint entity with biological Cold-Ischemia TTL</p>
                </div>
              </div>
              <button
                onClick={() => setIsHarvestModalOpen(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHarvestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1.5 font-medium">Organ Type</label>
                <select
                  value={harvestForm.organType}
                  onChange={(e) => {
                    const organ = e.target.value;
                    const hours = organ === 'HEART' ? 6 : organ === 'LIVER' ? 12 : 36;
                    setHarvestForm({ ...harvestForm, organType: organ, ischemiaHours: hours });
                  }}
                  className="w-full bg-neutral-900 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                >
                  <option value="HEART">Heart (Cold Ischemia Window: 6 Hours)</option>
                  <option value="LIVER">Liver (Cold Ischemia Window: 12 Hours)</option>
                  <option value="KIDNEY">Kidney (Cold Ischemia Window: 36 Hours)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Blood Group</label>
                  <select
                    value={harvestForm.bloodGroup}
                    onChange={(e) => setHarvestForm({ ...harvestForm, bloodGroup: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                  >
                    <option value="O_POS">O Positive (Universal Donor)</option>
                    <option value="A_POS">A Positive</option>
                    <option value="B_POS">B Positive</option>
                    <option value="AB_POS">AB Positive</option>
                    <option value="O_NEG">O Negative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Harvest Hospital Node</label>
                  <select
                    value={harvestForm.donorHospital}
                    onChange={(e) => {
                      const hosp = e.target.value;
                      const city = hosp === 'AIIMS_DELHI' ? 'New Delhi' : hosp === 'KEM_MUMBAI' ? 'Mumbai' : hosp === 'APOLLO_CHENNAI' ? 'Chennai' : 'Bengaluru';
                      setHarvestForm({ ...harvestForm, donorHospital: hosp, city });
                    }}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                  >
                    <option value="AIIMS_DELHI">AIIMS New Delhi</option>
                    <option value="KEM_MUMBAI">KEM Hospital Mumbai</option>
                    <option value="APOLLO_CHENNAI">Apollo Chennai</option>
                    <option value="NIMHANS_BENGALURU">NIMHANS Bengaluru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1.5 font-medium">
                  Cold-Ischemia TTL (Hours before Arkiv Block Expiration)
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={harvestForm.ischemiaHours}
                  onChange={(e) => setHarvestForm({ ...harvestForm, ischemiaHours: Number(e.target.value) })}
                  className="w-full bg-neutral-900 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none transition"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Set to 1 hour to witness fast on-chain block decay in testing.
                </span>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsHarvestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHarvest}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/40 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="aceternity-card !bg-neutral-950/95 !border-white/[0.12] rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Enroll Waitlist Recipient</h3>
                  <p className="text-xs text-neutral-400">Strictly DPDP compliant (Zero PII on-chain)</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecipientModalOpen(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecipientSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Target Organ</label>
                  <select
                    value={recipientForm.organType}
                    onChange={(e) => setRecipientForm({ ...recipientForm, organType: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                  >
                    <option value="HEART">Heart</option>
                    <option value="LIVER">Liver</option>
                    <option value="KIDNEY">Kidney</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Blood Group</label>
                  <select
                    value={recipientForm.bloodGroup}
                    onChange={(e) => setRecipientForm({ ...recipientForm, bloodGroup: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                  >
                    <option value="O_POS">O Positive</option>
                    <option value="A_POS">A Positive</option>
                    <option value="B_POS">B Positive</option>
                    <option value="AB_POS">AB Positive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Clinical Priority Score (0-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={recipientForm.priorityScore}
                    onChange={(e) => setRecipientForm({ ...recipientForm, priorityScore: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1.5 font-medium">Treating Hospital Node</label>
                  <select
                    value={recipientForm.hospitalNode}
                    onChange={(e) => setRecipientForm({ ...recipientForm, hospitalNode: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                  >
                    <option value="AIIMS_DELHI">AIIMS New Delhi</option>
                    <option value="KEM_MUMBAI">KEM Hospital Mumbai</option>
                    <option value="APOLLO_CHENNAI">Apollo Chennai</option>
                    <option value="NIMHANS_BENGALURU">NIMHANS Bengaluru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1.5 font-medium">Clinical Indication (Anonymous)</label>
                <input
                  type="text"
                  value={recipientForm.clinicalNotes}
                  onChange={(e) => setRecipientForm({ ...recipientForm, clinicalNotes: e.target.value })}
                  placeholder="e.g. MELD 36: End-stage hepatic failure with hepatorenal syndrome"
                  className="w-full bg-neutral-900 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none transition"
                />
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecipientModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecipient}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/40 transition"
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
      <footer className="border-t border-white/[0.06] bg-[#030712]/90 py-8 text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2 font-sans">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-neutral-300 font-semibold">OrganProtocol</span>
            <span>• Arkiv Devcon 8 Hackathon</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Operator: {network?.operatorAddress || '0x312d...E617'}</span>
            <span>Chain ID: 7738577</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
