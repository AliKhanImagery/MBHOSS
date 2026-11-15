'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Search,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Check,
  Upload,
  Calendar,
  Building,
  ExternalLink,
  RefreshCw,
  Send,
  Sparkles,
  Smartphone,
  EyeOff,
  User,
  ArrowRight,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { QuickAddRateModal } from '@/components/QuickAddRateModal';
import { IncotermTooltip } from '@/components/IncotermTooltip';
import { evaluateConfidence, formatPKR, IncotermCode } from '@/lib/commercial-math';
import { MasterItem, MasterSupplier, PriceLedgerRecord } from '@/lib/db';

export default function PriceLedgerAndBotSimulator() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [records, setRecords] = useState<PriceLedgerRecord[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [suppliers, setSuppliers] = useState<MasterSupplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfidence, setSelectedConfidence] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // WhatsApp Simulator State
  const [simPhone, setSimPhone] = useState('+923214567890'); // Ali Khan (Whitelisted)
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      sender: 'USER' | 'BOT' | 'SYSTEM';
      text: string;
      timestamp: string;
      hasMedia?: boolean;
      imageUrl?: string;
    }>
  >([
    {
      id: 'init-1',
      sender: 'SYSTEM',
      text: '🤖 Meta WhatsApp Cloud API Simulator initialized. Connected to state machine.',
      timestamp: '09:00',
    },
    {
      id: 'init-2',
      sender: 'BOT',
      text: 'Assalam-o-Alaikum! Welcome to OOS Price Intelligence Bot. Send any part rate, counter quote, or screenshot to log into the Gold Mine.',
      timestamp: '09:01',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [botState, setBotState] = useState<'IDLE' | 'AWAITING_CONFIRM' | 'AWAITING_SCREENSHOT'>('IDLE');
  const [isSending, setIsSending] = useState(false);

  const fetchLedger = async () => {
    try {
      const res = await fetch(`/api/ledger?search=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.items) setItems(data.items);
      if (data.suppliers) setSuppliers(data.suppliers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [searchTerm]);

  // Send WhatsApp message to webhook
  const handleSendMessage = async (textToSend?: string, imageUrl?: string) => {
    const text = textToSend !== undefined ? textToSend : inputMsg;
    if (!text.trim() && !imageUrl) return;

    const userMsgId = `usr-${Date.now()}`;
    const newMsg = {
      id: userMsgId,
      sender: 'USER' as const,
      text: text || (imageUrl ? '[Sent Redacted Screenshot]' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasMedia: !!imageUrl,
      imageUrl,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMsg('');
    setIsSending(true);

    try {
      const res = await fetch('/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: simPhone,
          text: text,
          imageUrl: imageUrl,
        }),
      });

      const data = await res.json();

      if (data.state) {
        setBotState(data.state);
      }

      const botReply = {
        id: `bot-${Date.now()}`,
        sender: 'BOT' as const,
        text: data.reply || (data.authorized === false ? data.reply : 'Received.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, botReply]);

      // If a record was committed, refresh the ledger table!
      if (data.committedRecord) {
        fetchLedger();
      }
    } catch (err) {
      console.error('WhatsApp sim error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Filter records by confidence
  const filteredRecords = records.filter((rec) => {
    if (selectedConfidence === 'ALL') return true;
    const conf = evaluateConfidence(rec.source_validity_date, !!rec.evidence_url, true);
    return conf.level === selectedConfidence;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navigation onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      <main className="flex-1 p-3 flex flex-col lg:flex-row gap-3 max-w-[1920px] mx-auto w-full overflow-hidden">
        {/* LEFT COLUMN: THE GOLD MINE PRICE LEDGER */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg flex flex-col shadow-xl overflow-hidden min-h-[600px]">
          {/* Header & Search */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>Price Intelligence Gold Mine</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {records.length} Verified Entries
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  Searchable historical rate repository collected via WhatsApp Bot, Shop Visits &amp; RFQs
                </p>
              </div>
            </div>

            {/* Confidence Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedConfidence('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  selectedConfidence === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedConfidence('GREEN')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1 ${
                  selectedConfidence === 'GREEN' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢 High (0-30d)</span>
              </button>
              <button
                onClick={() => setSelectedConfidence('YELLOW')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1 ${
                  selectedConfidence === 'YELLOW' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟡 Med (31-90d)</span>
              </button>
              <button
                onClick={() => setSelectedConfidence('RED')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1 ${
                  selectedConfidence === 'RED' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔴 Stale (&gt;90d)</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 bg-slate-850 border-b border-slate-800 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by part number, Brandreth shop, alias, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <button
              onClick={() => fetchLedger()}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="table-header-cell">Master Item &amp; Specs</th>
                  <th className="table-header-cell">Supplier / Location</th>
                  <th className="table-header-cell text-right">Unit Rate</th>
                  <th className="table-header-cell">Terms</th>
                  <th className="table-header-cell">Validity &amp; Confidence</th>
                  <th className="table-header-cell">Source &amp; Proof</th>
                  <th className="table-header-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No records matching your search criteria. Use Quick-Add or the WhatsApp simulator to log new rates!
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const conf = evaluateConfidence(rec.source_validity_date, !!rec.evidence_url, true);

                    return (
                      <tr key={rec.record_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Item & Specs */}
                        <td className="px-3 py-2">
                          <div className="font-bold text-amber-400 font-mono">
                            {rec.item?.official_sku || 'Item'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {rec.item?.brand} • {rec.item?.category}
                          </div>
                          <div className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                            {rec.item?.plain_english_description}
                          </div>
                        </td>

                        {/* 2. Supplier */}
                        <td className="px-3 py-2 font-medium text-slate-300">
                          <div>{rec.supplier?.company_name || 'Brandreth Counter'}</div>
                          <div className="text-[10px] text-slate-500">
                            {rec.supplier?.phone || '+92 300 0000000'}
                          </div>
                        </td>

                        {/* 3. Unit Cost */}
                        <td className="px-3 py-2 text-right font-mono font-bold text-white">
                          <div>
                            {rec.currency} {formatPKR(rec.unit_cost)}
                          </div>
                          {rec.currency === 'USD' && (
                            <div className="text-[10px] text-slate-400">
                              ≈ PKR {formatPKR(rec.unit_cost * 278.5)}
                            </div>
                          )}
                        </td>

                        {/* 4. Incoterm */}
                        <td className="px-3 py-2">
                          <IncotermTooltip code={rec.incoterm_code} showShort={true} />
                        </td>

                        {/* 5. Validity & Confidence */}
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${conf.pillColor}`}
                            title={conf.explanation}
                          >
                            {conf.badgeIcon} {conf.level} ({conf.ageDays}d)
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Valid: {new Date(rec.source_validity_date).toLocaleDateString('en-GB')}
                          </div>
                        </td>

                        {/* 6. Source & Proof */}
                        <td className="px-3 py-2 text-[10px]">
                          <div className="text-slate-300 font-medium">{rec.source_origin}</div>
                          <div className="text-slate-500">
                            By {rec.submitter?.full_name || 'Procurement Staff'}
                          </div>
                          {rec.evidence_url && (
                            <a
                              href={rec.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 mt-0.5"
                            >
                              <span>[📎 Screenshot]</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        {/* 7. Notes */}
                        <td className="px-3 py-2 text-[11px] text-slate-400 max-w-[200px]">
                          <div className="line-clamp-2">{rec.notes || '—'}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: WHATSAPP BOT & REDACTED SCREENSHOT SIMULATOR */}
        <div className="w-full lg:w-[460px] bg-slate-900 border border-slate-800 rounded-lg flex flex-col shadow-xl overflow-hidden flex-shrink-0">
          {/* Simulator Header */}
          <div className="p-3 bg-emerald-950/80 border-b border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white flex items-center space-x-1">
                  <span>WhatsApp Cloud API Simulator</span>
                </h2>
                <div className="text-[10px] text-emerald-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active State: </span>
                  <span className="font-mono font-bold bg-emerald-900/80 px-1 rounded text-white">
                    {botState}
                  </span>
                </div>
              </div>
            </div>

            {/* Whitelist Phone Switcher */}
            <div className="text-right">
              <select
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                className="bg-slate-950 border border-emerald-700/60 rounded px-1.5 py-0.5 text-[10px] text-emerald-200 focus:outline-none"
              >
                <option value="+923214567890">Ali Khan (+923214567890) [Whitelisted]</option>
                <option value="+923008451122">Tariq CTO (+923008451122) [Whitelisted]</option>
                <option value="+923337890123">Hamza Rauf (+923337890123) [Whitelisted]</option>
                <option value="+923459998877">Unknown Phone (+923459998877) [Blocked]</option>
              </select>
            </div>
          </div>

          {/* Simulator Guidance Info */}
          <div className="p-2 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 flex items-start space-x-1.5">
            <EyeOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>4-State Proof Request Loop:</strong> Complete rate text &rarr; Bot prompts &quot;Reply 1 to save&quot;. Incomplete/corrections &rarr; Bot requests redacted screenshot &rarr; Reply &apos;1&apos; commits to Gold Mine!
            </div>
          </div>

          {/* Quick Test Prompt Trigger Buttons */}
          <div className="p-2 bg-slate-850/80 border-b border-slate-800 grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={() => handleSendMessage('Siemens 24V chota relay 14500 Brandreth Brandt')}
              className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-200 text-left font-mono truncate"
              title="Test Complete Text Match"
            >
              1. Complete Text Rate
            </button>
            <button
              onClick={() => handleSendMessage('Siemens 24V relay')}
              className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-200 text-left font-mono truncate"
              title="Test Incomplete Text (Triggers Proof Loop)"
            >
              2. Incomplete (Trigger Proof)
            </button>
            <button
              onClick={() =>
                handleSendMessage(
                  undefined,
                  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
                )
              }
              className="p-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 rounded text-emerald-300 text-left font-mono truncate flex items-center space-x-1"
              title="Simulate Sending Redacted Screenshot"
            >
              <Upload className="w-3 h-3 text-emerald-400" />
              <span>3. Send Redacted Screenshot</span>
            </button>
            <button
              onClick={() => handleSendMessage('1')}
              className="p-1 bg-amber-950 hover:bg-amber-900 border border-amber-700/60 rounded text-amber-300 text-left font-bold font-mono truncate flex items-center space-x-1"
              title="Reply '1' to Confirm & Commit"
            >
              <Check className="w-3 h-3 text-amber-400" />
              <span>4. Reply &apos;1&apos; (Commit)</span>
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-950/70">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'USER';
              const isSystem = msg.sender === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-1">
                    <span className="text-[9px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-sm ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.hasMedia && msg.imageUrl && (
                      <div className="mb-1.5 rounded overflow-hidden border border-emerald-400/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.imageUrl}
                          alt="Screenshot"
                          className="w-full h-28 object-cover"
                        />
                        <div className="bg-emerald-950/90 p-1 text-[9px] text-emerald-200 flex items-center justify-between">
                          <span>[Redacted Supplier Chat Proof]</span>
                          <EyeOff className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    )}
                    <div className="whitespace-pre-line leading-relaxed font-sans">{msg.text}</div>
                    <div
                      className={`text-[9px] text-right mt-1 font-mono ${
                        isUser ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Bar */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center space-x-1.5">
            <input
              type="text"
              placeholder={
                botState === 'AWAITING_CONFIRM'
                  ? "Reply '1' to confirm & commit, or type corrections..."
                  : botState === 'AWAITING_SCREENSHOT'
                  ? 'Send screenshot or type item details...'
                  : "Type part quote (e.g. 'Siemens 24V relay 14500 PKR')..."
              }
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputMsg.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      <QuickAddRateModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onRateAdded={fetchLedger}
        masterItems={items}
        masterSuppliers={suppliers}
      />
    </div>
  );
}
