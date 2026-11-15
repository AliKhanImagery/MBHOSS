'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Paperclip,
  Send,
  Printer,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  Bot,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  ArrowRight,
  Sliders,
  DollarSign,
  Clock,
  Layers,
  ChevronDown,
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
    recalculateTotals,
    dataBank,
    chatMessages,
    addChatMessage,
    clearChat,
    saveCurrentCase,
    currentUser,
  } = useApp();

  // Chat State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
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
      setInputPrompt((prev) => prev || `Please extract and quote the line items from this tender document.`);
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
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950">
      {/* =========================================================================
          LEFT PANE (50% WIDTH): QRI AI CHAT & JOURNEY LOG
      ========================================================================= */}
      <section className="w-full lg:w-1/2 flex flex-col h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 flex-shrink-0">
        {/* Chat Pane Header */}
        <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-white">Qri AI Agent</span>
                <span className="flex items-center space-x-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Data Bank Connected</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Conversational Procurement &amp; Quote Builder
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Clear Chat Journey Log"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto whitespace-nowrap flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold mr-1">
            Suggestions:
          </span>
          {[
            'Add 5 Siemens 24V Relays for Engro with 15% margin',
            'Add 3 Schneider 25A Contactors with 20% margin',
            'Apply 18% GST to this quote',
            'Change delivery terms to Ex-Stock Lahore',
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(suggestion)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 hover:border-amber-500/40 border border-slate-700/80 rounded-full text-[10px] text-slate-300 hover:text-amber-300 transition-all cursor-pointer font-sans"
            >
              + {suggestion}
            </button>
          ))}
        </div>

        {/* Chat Messages Journey Log Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex items-center justify-center my-1">
                  <div className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-3 py-1 rounded-full font-mono flex items-center space-x-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white'
                      : 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                  <div
                    className={`text-[9px] mt-1 font-mono text-right ${
                      isUser ? 'text-blue-200' : 'text-slate-500'
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
            <div className="flex items-start space-x-2.5 animate-in fade-in">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-amber-300 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span className="font-mono">Qri AI is calculating prices &amp; routing quotation...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col space-y-1.5 flex-shrink-0">
          {attachedFileName && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-lg text-[11px] font-mono">
              <div className="flex items-center space-x-1.5 truncate">
                <Paperclip className="w-3 h-3" />
                <span className="truncate">Attached: {attachedFileName}</span>
              </div>
              <button
                onClick={() => setAttachedFileName(null)}
                className="text-amber-400 hover:text-white ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Attach scanned PDF tender or image quote"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Tell Qri AI: e.g. 'Add 5 relays for Engro with 15% margin'..."
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={isAgentThinking || (!inputPrompt.trim() && !attachedFileName)}
              className="p-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-950/40 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RIGHT PANE (50% WIDTH): LIVE EDITABLE A4 QUOTATION DOCUMENT
      ========================================================================= */}
      <section className="w-full lg:w-1/2 flex flex-col h-1/2 lg:h-full bg-slate-900/60 overflow-hidden">
        {/* Document Header & Actions Bar */}
        <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-xs text-white">Live Quotation Preview</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Ref: {templateState.quoteRef}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {saveSuccessNotice && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved to Cases!</span>
              </span>
            )}

            <button
              onClick={() => addLineItem()}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 cursor-pointer"
              title="Add blank line item manually"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Item</span>
            </button>

            <button
              onClick={handleSaveToCases}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 cursor-pointer transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Case</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/40 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Workspace Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-slate-950/80">
          {/* THE PHYSICAL A4 PAPER CARD */}
          <div
            id="quotation-printable-document"
            className="w-full max-w-[800px] bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-8 flex flex-col justify-between border border-slate-200 relative min-h-[960px] text-xs font-sans"
          >
            <div>
              {/* Document Letterhead Top Header */}
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
                    COMMERCIAL QUOTE
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-800">
                    REF:{' '}
                    <input
                      type="text"
                      value={templateState.quoteRef}
                      onChange={(e) => updateTemplateField('quoteRef', e.target.value)}
                      className="border-b border-dashed border-slate-400 font-mono text-right w-28 text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    Date:{' '}
                    <input
                      type="date"
                      value={templateState.date}
                      onChange={(e) => updateTemplateField('date', e.target.value)}
                      className="border-b border-dashed border-slate-300 font-mono text-right text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Client & Commercial Terms Metadata (Live Editable) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded p-3 mb-5 text-[11px]">
                {/* Column 1: Client Info */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Client Details:
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold w-16">Customer:</span>
                    <input
                      type="text"
                      value={templateState.clientName}
                      onChange={(e) => updateTemplateField('clientName', e.target.value)}
                      placeholder="e.g. Engro Fertilizers Ltd"
                      className="flex-1 font-bold text-slate-900 border-b border-dashed border-slate-400 bg-transparent focus:outline-none focus:border-blue-600 py-0.5"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold w-16">Attention:</span>
                    <input
                      type="text"
                      value={templateState.clientContact}
                      onChange={(e) => updateTemplateField('clientContact', e.target.value)}
                      placeholder="e.g. Chief Electrical Engineer"
                      className="flex-1 text-slate-800 border-b border-dashed border-slate-300 bg-transparent focus:outline-none py-0.5"
                    />
                  </div>
                </div>

                {/* Column 2: Commercial Terms */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Commercial Terms:
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold w-20">Delivery:</span>
                    <input
                      type="text"
                      value={templateState.deliveryTerms}
                      onChange={(e) => updateTemplateField('deliveryTerms', e.target.value)}
                      placeholder="Ex-Stock"
                      className="flex-1 font-medium text-slate-900 border-b border-dashed border-slate-300 bg-transparent focus:outline-none py-0.5"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold w-20">Payment:</span>
                    <input
                      type="text"
                      value={templateState.paymentTerms}
                      onChange={(e) => updateTemplateField('paymentTerms', e.target.value)}
                      placeholder="100% Advance"
                      className="flex-1 font-medium text-slate-900 border-b border-dashed border-slate-300 bg-transparent focus:outline-none py-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Table (Live Editable Cells) */}
              <div className="mb-5 border border-slate-300 rounded overflow-hidden">
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
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                        {/* Num */}
                        <td className="py-2 px-2 text-center font-mono text-slate-500">{idx + 1}</td>

                        {/* Description */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none font-medium text-slate-900"
                          />
                        </td>

                        {/* Brand / Model */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.partNumber || item.brand}
                            onChange={(e) => updateLineItem(item.id, { partNumber: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none font-mono text-[10px] text-slate-700"
                          />
                        </td>

                        {/* Qty */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              updateLineItem(item.id, { qty: parseInt(e.target.value, 10) || 1 })
                            }
                            className="w-12 text-center font-mono font-bold bg-slate-50 border border-slate-300 rounded py-0.5 focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* UoM */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={item.uom}
                            onChange={(e) => updateLineItem(item.id, { uom: e.target.value.toUpperCase() })}
                            className="w-10 text-center uppercase font-mono text-[10px] bg-transparent focus:outline-none"
                          />
                        </td>

                        {/* Unit Price (PKR) */}
                        <td className="py-2 px-2 text-right font-mono">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 text-right font-mono font-semibold bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(item.total)}
                        </td>

                        {/* Delete Row */}
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
                <div className="w-72 bg-slate-50 border border-slate-300 rounded p-3 space-y-2 text-[11px]">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">
                      PKR {formatPKR(templateState.subtotal)}
                    </span>
                  </div>

                  {/* Tax Mode Toggle */}
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-600">Sales Tax (GST):</span>
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
                      <span className="font-mono">PKR {formatPKR(templateState.taxAmount)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between items-center border-t-2 border-slate-900 pt-2 text-slate-950 font-bold text-sm">
                    <span>GRAND TOTAL (PKR):</span>
                    <span className="font-mono font-black text-amber-700 text-base">
                      PKR {formatPKR(templateState.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Standard Terms & Conditions */}
              <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-600 space-y-1">
                <div className="font-bold uppercase text-slate-800 tracking-wider">
                  Commercial Terms &amp; Conditions:
                </div>
                {templateState.notes.map((note, i) => (
                  <p key={i}>• {note}</p>
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
                Page 1 of 1 • System Generated by Qri OS
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
