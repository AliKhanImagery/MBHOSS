'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Paperclip,
  Send,
  Printer,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Bot,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  FileCog,
  Building,
  Sliders,
  DollarSign,
  Clock,
  Layers,
  ChevronDown,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { QuoteLineItem } from '@/types';

export default function QuotationAgentPage() {
  const {
    templateState,
    setTemplateState,
    updateTemplateField,
    updateLineItem,
    addLineItem,
    removeLineItem,
    dataBank,
    chatMessages,
    addChatMessage,
    clearChat,
    saveCurrentCase,
    globalLetterheadPdf,
    letterheadFileName,
    masterTemplateRules,
  } = useApp();

  // Chat State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'document'>('chat');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAgentThinking]);

  // Send message to Qri AI agent API
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputPrompt;
    if (!text.trim() && !attachedFileName) return;

    let fullPrompt = text;
    if (attachedFileName) {
      fullPrompt = `[Attached Tender Document: ${attachedFileName}] ${text}`;
    }

    // 1. Append User Message to Journey Log
    addChatMessage({
      sender: 'user',
      text: fullPrompt,
    });

    setInputPrompt('');
    setAttachedFileName(null);
    setIsAgentThinking(true);

    try {
      const res = await fetch('/api/qri-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          current_template: templateState,
          databank_items: dataBank,
          master_template_rules: masterTemplateRules, // Injected on every request!
        }),
      });

      if (!res.ok) throw new Error('Agent failed to process quote request');

      const data = await res.json();

      // 2. Append Agent Response to Chat
      addChatMessage({
        sender: 'agent',
        text: data.chat_response || 'Updated the quotation document according to your instruction.',
      });

      // 3. Instantly Update the Right Pane Document State
      if (data.template_state) {
        setTemplateState(data.template_state);
      }
    } catch (err: any) {
      console.error(err);
      addChatMessage({
        sender: 'system',
        text: `⚠️ Agent Notice: ${err.message || 'Error communicating with AI engine'}. Using live document controls.`,
      });
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      setInputPrompt((prev) => prev || `Please extract line items from this tender document.`);
    }
  };

  const handleSaveToCases = () => {
    saveCurrentCase('Draft');
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
    addChatMessage({
      sender: 'system',
      text: `Quotation ${templateState.quoteRef} saved to Active Cases under Draft status.`,
    });
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const formatPKR = (num: number) => {
    return new Intl.NumberFormat('en-PK').format(num || 0);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden gap-3 sm:gap-4 md:gap-5 p-1 sm:p-2 md:p-3 bg-transparent">
      {/* Mobile Segmented View Control (Visible only on mobile/tablet < lg) */}
      <div className="lg:hidden h-14 bg-white border border-[#D5D5DF] rounded-2xl px-3 flex items-center justify-between flex-shrink-0 z-30 shadow-sm">
        <div className="flex bg-[#EAEAEF] p-1 rounded-xl flex-1 max-w-xs mr-2">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              mobileTab === 'chat'
                ? 'bg-[#FF4D6D] text-white shadow-sm'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Chat</span>
          </button>
          <button
            onClick={() => setMobileTab('document')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              mobileTab === 'document'
                ? 'bg-[#FF4D6D] text-white shadow-sm'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quote (Rs. {formatPKR(templateState.grandTotal)})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleSaveToCases}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-[#FF4D6D] rounded-xl text-xs font-bold transition-colors"
            title="Save to Cases"
          >
            Save
          </button>
          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
            title="Print PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LEFT PANE (50% WIDTH ON DESKTOP): QRI AI CHAT (MINIMALIST LIGHT CARD)
      ========================================================================= */}
      <section
        className={`w-full lg:w-1/2 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 text-slate-900 shadow-xs overflow-hidden flex-shrink-0 ${
          mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Chat Pane Header */}
        <div className="h-14 sm:h-16 px-5 sm:px-6 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#FF4D6D]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 font-sans">Qri AI Agent</span>
                <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Rules Active</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Procurement Router &amp; Proposal Engine
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/settings/templates"
              className="text-xs text-[#FF4D6D] hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full flex items-center space-x-1 font-semibold"
              title="Configure Global Letterhead & DOCX Rules"
            >
              <FileCog className="w-3.5 h-3.5" />
              <span>Rules</span>
            </Link>
            <button
              onClick={clearChat}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear Journey Log"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 overflow-x-auto whitespace-nowrap flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">
            Prompt Chips:
          </span>
          {[
            'Add 5 Siemens 24V Relays for Engro with 15% margin',
            'Give 90 days credit payment terms',
            'Change delivery terms to 8 weeks air freight',
            'Set quotation validity to 30 days',
            'Apply 18% GST to this quote',
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(suggestion)}
              className="px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer font-medium border bg-white text-slate-700 border-slate-200 hover:border-[#FF4D6D] hover:text-[#FF4D6D] shadow-2xs"
            >
              + {suggestion}
            </button>
          ))}
        </div>

        {/* Chat Messages Journey Log Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';
            const hasWarning = msg.text.includes('⚠️') || msg.text.includes('WARNING');

            if (isSystem) {
              return (
                <div key={msg.id} className="flex items-center justify-center my-1.5">
                  <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3.5 py-1 rounded-full font-mono flex items-center space-x-2 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF4D6D]" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : hasWarning
                      ? 'bg-[#FF4D6D] text-white font-black'
                      : 'bg-rose-50 border border-rose-200 text-[#FF4D6D] font-bold shadow-xs'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : hasWarning
                      ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-none'
                      : 'bg-slate-100 border border-slate-200/80 text-slate-900 rounded-tl-none'
                  }`}
                >
                  {/* Warning banner inside message if deviation occurred */}
                  {hasWarning && !isUser && (
                    <div className="mb-2 pb-1.5 border-b border-rose-200 flex items-center space-x-2 text-rose-700 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>MASTER TEMPLATE POLICY ALERT</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line">{msg.text}</div>

                  <div
                    className={`text-xs mt-1.5 font-mono text-right ${
                      isUser ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI Thinking Indicator */}
          {isAgentThinking && (
            <div className="flex items-start space-x-3 animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[#FF4D6D]">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-[#FF4D6D] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-ping"></span>
                <span className="font-mono text-xs">
                  Qri AI is validating Master Rules &amp; calculating proposal...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex flex-col space-y-2 flex-shrink-0">
          {attachedFileName && (
            <div className="flex items-center justify-between bg-rose-50 border border-rose-200 text-[#FF4D6D] px-3.5 py-1.5 rounded-xl text-xs font-mono">
              <div className="flex items-center space-x-2 truncate">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate font-semibold">Attached: {attachedFileName}</span>
              </div>
              <button
                onClick={() => setAttachedFileName(null)}
                className="text-slate-500 hover:text-rose-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Attach tender PDF or screenshot"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Tell Qri AI: e.g. 'Add 5 relays for Engro with 15% margin'..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-sans"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isAgentThinking || (!inputPrompt.trim() && !attachedFileName)}
              className="p-2.5 bg-[#FF4D6D] hover:bg-[#FA3B5E] disabled:opacity-40 text-white font-bold rounded-xl shadow-sm cursor-pointer transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RIGHT PANE (50% WIDTH ON DESKTOP): LIVE EDITABLE QUOTATION
          (Zero Top Obstruction to Exploit Full Vertical Space)
      ========================================================================= */}
      <section
        className={`w-full lg:w-1/2 flex flex-col h-full bg-[#EAEDF2] rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative ${
          mobileTab === 'document' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Floating Action Pill in Top-Right Gutter (ZERO vertical space lost!) */}
        <div className="absolute top-3 right-4 z-20 flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-full px-3 py-1.5 print:hidden">
          <span className="text-xs font-mono font-bold text-slate-700 hidden sm:inline mr-1">
            {templateState.quoteRef}
          </span>
          <button
            onClick={() => addLineItem()}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Add blank line item manually"
          >
            + Item
          </button>
          <button
            onClick={handleSaveToCases}
            className="px-3 py-1 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            Save
          </button>
          <button
            onClick={handlePrintPdf}
            className="px-3 py-1 rounded-full bg-[#FF4D6D] hover:bg-[#FA3B5E] text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center space-x-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>

        {/* Scrollable A4 Document Workspace Container (Mounts Directly at Top Edge) */}
        <div className="flex-1 overflow-y-auto pt-2 sm:pt-3 pb-8 px-2 sm:px-4 flex justify-center bg-transparent relative">
          {/* THE PHYSICAL A4 PAPER CARD */}
          <div
            id="quotation-printable-document"
            className="w-full max-w-[800px] bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-200 relative min-h-[1050px] text-xs font-sans overflow-hidden"
          >
            {/* =========================================================================
                FIXED BACKGROUND LAYER (z-index: 0): Uploaded Letterhead PDF or Corporate Vector
            ========================================================================= */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
              {globalLetterheadPdf ? (
                <iframe
                  src={`${globalLetterheadPdf}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full border-0 pointer-events-none opacity-90 scale-100"
                  title="Global Letterhead PDF Background"
                />
              ) : (
                /* Elegant fallback corporate stationery graphics */
                <div className="w-full h-full p-8 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b-2 border-slate-400 pb-4">
                    <div className="text-xl font-black text-slate-600 tracking-wider">
                      OOS INDUSTRIAL PROCUREMENT &amp; ENGINEERING
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Official Corporate Stationery • Brandreth Road Lahore
                    </div>
                  </div>
                  <div className="flex items-center justify-center my-auto">
                    <div className="text-7xl font-black text-slate-300/40 rotate-[-25deg] tracking-widest">
                      OOS PROCUREMENT
                    </div>
                  </div>
                  <div className="border-t border-slate-300 pt-3 text-[9px] text-slate-400 flex justify-between">
                    <span>NTN: 8492019-3 • Official Bank: Meezan Bank Ltd</span>
                    <span>Lahore • Karachi • Pakistan</span>
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================================
                LIVE EDITABLE HTML TEXT OVERLAY LAYER (z-index: 10): All contentEditable={true}
            ========================================================================= */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[1050px]">
              <div>
                {/* Header Metadata */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                      OOS Industrial Procurement &amp; Engineering
                    </h2>
                    <p className="text-[10px] text-slate-600 font-medium">
                      Specialized Automation, Switchgear &amp; Heavy MRO Supplies
                    </p>
                    <p className="text-[9px] text-slate-500">
                      Brandreth Road, Lahore • Tel: +92 42 3722 1199 • quotes@oosprocurement.com
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="inline-block bg-slate-900 text-white px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wider">
                      COMMERCIAL PROPOSAL
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-800">
                      REF:{' '}
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('quoteRef', e.currentTarget.textContent || '')}
                        className="border-b border-dashed border-slate-400 px-1 py-0.5 hover:bg-amber-100/60 focus:bg-amber-100 outline-none rounded cursor-text"
                      >
                        {templateState.quoteRef}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      Date:{' '}
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('date', e.currentTarget.textContent || '')}
                        className="border-b border-dashed border-slate-300 px-1 py-0.5 hover:bg-amber-100/60 focus:bg-amber-100 outline-none rounded cursor-text"
                      >
                        {templateState.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client & Commercial Terms Metadata (contentEditable={true}) */}
                <div className="grid grid-cols-2 gap-4 bg-white/90 backdrop-blur-xs border border-slate-200 rounded p-3 mb-5 text-[11px] shadow-xs">
                  {/* Column 1: Client Info */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Client Details:
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold w-16">Customer:</span>
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('clientName', e.currentTarget.textContent || '')}
                        className="flex-1 font-bold text-slate-900 border-b border-dashed border-slate-400 hover:bg-amber-100/60 focus:bg-amber-100 outline-none px-1 py-0.5 rounded cursor-text min-w-[120px]"
                      >
                        {templateState.clientName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold w-16">Attention:</span>
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('clientContact', e.currentTarget.textContent || '')}
                        className="flex-1 text-slate-800 border-b border-dashed border-slate-300 hover:bg-amber-100/60 focus:bg-amber-100 outline-none px-1 py-0.5 rounded cursor-text min-w-[120px]"
                      >
                        {templateState.clientContact}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Commercial Terms */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Commercial Terms:
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold w-20">Delivery:</span>
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('deliveryTerms', e.currentTarget.textContent || '')}
                        className="flex-1 font-medium text-slate-900 border-b border-dashed border-slate-300 hover:bg-amber-100/60 focus:bg-amber-100 outline-none px-1 py-0.5 rounded cursor-text min-w-[100px]"
                      >
                        {templateState.deliveryTerms}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold w-20">Payment:</span>
                      <span
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => updateTemplateField('paymentTerms', e.currentTarget.textContent || '')}
                        className="flex-1 font-medium text-slate-900 border-b border-dashed border-slate-300 hover:bg-amber-100/60 focus:bg-amber-100 outline-none px-1 py-0.5 rounded cursor-text min-w-[100px]"
                      >
                        {templateState.paymentTerms}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Line Items Table (All Cells contentEditable={true}) */}
                <div className="mb-5 border border-slate-300 rounded overflow-hidden bg-white/95 backdrop-blur-xs shadow-xs">
                  <table className="w-full border-collapse text-[11px] text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                        <th className="py-2 px-2.5 w-8 text-center">#</th>
                        <th className="py-2 px-3">Description &amp; Specifications</th>
                        <th className="py-2 px-2 w-24">Brand / Model</th>
                        <th className="py-2 px-2 w-14 text-center">Qty</th>
                        <th className="py-2 px-2 w-12 text-center">UoM</th>
                        <th className="py-2 px-2 w-24 text-right">Unit Price (PKR)</th>
                        <th className="py-2 px-3 w-28 text-right">Total (PKR)</th>
                        <th className="py-2 px-1 w-6 text-center print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {templateState.lineItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-amber-50/50 transition-colors group">
                          {/* Num */}
                          <td className="py-2 px-2 text-center font-mono text-slate-500">{idx + 1}</td>

                          {/* Description (contentEditable) */}
                          <td className="py-2 px-3">
                            <div
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onBlur={(e) =>
                                updateLineItem(item.id, { description: e.currentTarget.textContent || '' })
                              }
                              className="font-medium text-slate-900 hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text"
                            >
                              {item.description}
                            </div>
                          </td>

                          {/* Brand / Model (contentEditable) */}
                          <td className="py-2 px-2">
                            <div
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onBlur={(e) =>
                                updateLineItem(item.id, { partNumber: e.currentTarget.textContent || '' })
                              }
                              className="font-mono text-[10px] text-slate-700 hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text"
                            >
                              {item.partNumber || item.brand}
                            </div>
                          </td>

                          {/* Qty (contentEditable) */}
                          <td className="py-2 px-2 text-center">
                            <div
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onBlur={(e) => {
                                const q = parseInt(e.currentTarget.textContent || '1', 10);
                                updateLineItem(item.id, { qty: isNaN(q) ? 1 : q });
                              }}
                              className="font-mono font-bold text-center hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text"
                            >
                              {item.qty}
                            </div>
                          </td>

                          {/* UoM (contentEditable) */}
                          <td className="py-2 px-2 text-center">
                            <div
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onBlur={(e) =>
                                updateLineItem(item.id, {
                                  uom: (e.currentTarget.textContent || 'PCS').toUpperCase(),
                                })
                              }
                              className="font-mono text-center uppercase text-[10px] hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text"
                            >
                              {item.uom}
                            </div>
                          </td>

                          {/* Unit Price (PKR) (contentEditable) */}
                          <td className="py-2 px-2 text-right font-mono">
                            <div
                              contentEditable={true}
                              suppressContentEditableWarning={true}
                              onBlur={(e) => {
                                const p = parseFloat(
                                  (e.currentTarget.textContent || '0').replace(/[^0-9.]/g, '')
                                );
                                updateLineItem(item.id, { unitPrice: isNaN(p) ? 0 : p });
                              }}
                              className="font-mono font-semibold text-right hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text"
                            >
                              {formatPKR(item.unitPrice)}
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatPKR(item.total)}
                          </td>

                          {/* Delete */}
                          <td className="py-2 px-1 text-center print:hidden">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Tax Calculation Box */}
                <div className="flex justify-end mb-6">
                  <div className="w-72 bg-white/95 backdrop-blur-xs border border-slate-300 rounded p-3 space-y-2 text-[11px] shadow-sm">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-slate-900">
                        PKR {formatPKR(templateState.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                      <span className="text-slate-600">Sales Tax Regime:</span>
                      <select
                        value={templateState.taxMode}
                        onChange={(e) => updateTemplateField('taxMode', e.target.value as any)}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
                      >
                        <option value="WITHOUT_GST">Without GST (0%)</option>
                        <option value="GST_18">+18% Sales Tax (GST)</option>
                      </select>
                    </div>

                    {templateState.taxMode === 'GST_18' && (
                      <div className="flex justify-between items-center text-slate-600 text-[10px]">
                        <span>18% GST Amount:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          PKR {formatPKR(templateState.taxAmount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t-2 border-slate-900 pt-2 text-slate-950 font-bold text-sm">
                      <span>GRAND TOTAL (PKR):</span>
                      <span className="font-mono font-black text-amber-700 text-base">
                        PKR {formatPKR(templateState.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions (contentEditable={true} on each term) */}
                <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-600 space-y-1.5 bg-white/90 backdrop-blur-xs p-3 rounded shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-slate-800 tracking-wider">
                      Commercial Terms &amp; Conditions:
                    </span>
                    <button
                      onClick={() => {
                        const newNotes = [...templateState.notes, 'Custom agreed commercial term.'];
                        updateTemplateField('notes', newNotes);
                      }}
                      className="text-[9px] text-blue-600 hover:underline print:hidden cursor-pointer"
                    >
                      + Add T&amp;C Clause
                    </button>
                  </div>
                  {templateState.notes.map((note, i) => (
                    <div
                      key={i}
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        const updated = [...templateState.notes];
                        updated[i] = e.currentTarget.textContent?.replace(/^•\s*/, '') || '';
                        updateTemplateField('notes', updated);
                      }}
                      className="hover:bg-amber-100/60 focus:bg-amber-100 outline-none p-1 rounded cursor-text leading-relaxed"
                    >
                      • {note}
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Signature Footer */}
              <div className="border-t border-slate-200 pt-4 mt-8 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-800">For OOS Industrial Procurement</p>
                  <p>Authorized Commercial Signatory</p>
                </div>
                <div className="text-right font-mono">
                  Page 1 of 1 • Generated via Qri OS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
