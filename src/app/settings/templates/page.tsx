'use client';

import React, { useState, useRef } from 'react';
import mammoth from 'mammoth';
import {
  FileCog,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Trash2,
  Eye,
  Sliders,
  ShieldCheck,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function TemplateSettingsPage() {
  const {
    globalLetterheadPdf,
    letterheadFileName,
    setGlobalLetterheadPdf,
    masterTemplateRules,
    setMasterTemplateRules,
    resetMasterTemplateRules,
  } = useApp();

  const [pdfUploadNotice, setPdfUploadNotice] = useState<string | null>(null);
  const [docxUploadNotice, setDocxUploadNotice] = useState<string | null>(null);
  const [isExtractingDocx, setIsExtractingDocx] = useState(false);
  const [rulesEditorText, setRulesEditorText] = useState(masterTemplateRules);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  // Sync state if context changes
  React.useEffect(() => {
    setRulesEditorText(masterTemplateRules);
  }, [masterTemplateRules]);

  // 1. Handle Global Letterhead PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setGlobalLetterheadPdf(result, file.name);
      setPdfUploadNotice(`Successfully uploaded & saved "${file.name}" to global template storage.`);
      setTimeout(() => setPdfUploadNotice(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = () => {
    setGlobalLetterheadPdf(null, '');
    setPdfUploadNotice('Removed custom PDF letterhead. Default vector letterhead active.');
    setTimeout(() => setPdfUploadNotice(null), 3000);
  };

  // 2. Handle DOCX Upload & Raw Text / T&C Extraction using Mammoth
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Please upload a valid Microsoft Word (.docx) file.');
      return;
    }

    setIsExtractingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawExtracted = result.value.trim();

      if (!rawExtracted) {
        throw new Error('No readable text could be extracted from this Word document.');
      }

      // Structure and clean extracted text block
      const structuredRules = `MASTER COMMERCIAL RULES & T&CS (EXTRACTED FROM: ${file.name.toUpperCase()}):
${rawExtracted}`;

      setRulesEditorText(structuredRules);
      setMasterTemplateRules(structuredRules);
      setDocxUploadNotice(
        `Extracted ${rawExtracted.split(/\s+/).length} words and saved into master_template_rules successfully.`
      );
      setTimeout(() => setDocxUploadNotice(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to extract text from .docx: ${err.message}`);
    } finally {
      setIsExtractingDocx(false);
    }
  };

  const handleSaveManualRules = () => {
    setMasterTemplateRules(rulesEditorText);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Sample DOCX / T&Cs quick load
  const handleLoadSampleTerms = () => {
    const sample = `STANDARD COMMERCIAL RULES & MANDATORY TERMS (OOS MASTER TEMPLATE):
1. PAYMENT TERMS: Standard terms are 100% Advance Against Proforma Invoice, or 50% Advance with 50% Balance on Delivery. Any credit term exceeding 30 Days (e.g. 60 Days or 90 Days Credit) is strictly prohibited without written CFO/CTO approval.
2. DELIVERY TERMS: Standard ex-stock delivery is 1-3 business days. Indent / import items are 2-4 weeks standard air freight. Unrealistic delivery commitments (e.g. same-day delivery or >6 weeks without indent contract) violate template policy.
3. QUOTATION VALIDITY: Standard price validity is strictly 7 calendar days due to import rate and PKR/USD currency volatility. Quoting validity exceeding 15 days is prohibited.
4. TARGET PROFIT MARGIN: Minimum baseline margin is 12%. Recommended operational target margin is 15% to 20%. Margins below 10% require management override.
5. TAX REGIME: Domestic tenders default to without GST unless client specifies sales tax invoice (+18% GST). Invoices requiring WHT deduction must be grossed up.
6. WARRANTY: Standard 12 months manufacturer warranty against manufacturing defects only.
7. PENALTIES: Late delivery penalties or liquidated damages (LD clauses) are not accepted.`;

    setRulesEditorText(sample);
    setMasterTemplateRules(sample);
    setDocxUploadNotice('Loaded standard OOS Commercial Rules & T&Cs.');
    setTimeout(() => setDocxUploadNotice(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100 select-none">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCog className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Template Settings &amp; Master Commercial Rules</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Active in Qri AI
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Upload global letterhead backgrounds and extract master T&amp;C rules from Word (.docx) files
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Rules Saved to Storage!</span>
            </span>
          )}
          <button
            onClick={resetMasterTemplateRules}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer"
            title="Reset Master Template Rules to Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSaveManualRules}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Rules</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* TWO UPLOAD ZONES ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* UPLOAD ZONE 1: GLOBAL LETTERHEAD (PDF) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    1
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Global Letterhead (PDF)
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Visual background template for the Live Quotation Preview
                    </p>
                  </div>
                </div>

                {globalLetterheadPdf && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active PDF</span>
                  </span>
                )}
              </div>

              {pdfUploadNotice && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{pdfUploadNotice}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={pdfInputRef}
                onChange={handlePdfUpload}
                accept="application/pdf"
                className="hidden"
              />

              <div
                onClick={() => pdfInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-amber-300">
                  {letterheadFileName ? 'Replace Letterhead PDF' : 'Click to Upload Letterhead PDF'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                  Upload an official pre-printed blank letterhead PDF (A4 format). Saved into localStorage as visual background.
                </p>
              </div>

              {letterheadFileName && (
                <div className="mt-3 p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-300 truncate font-mono text-[11px]">
                    <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{letterheadFileName}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => setShowPdfPreview(!showPdfPreview)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Preview PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRemovePdf}
                      className="p-1 text-slate-400 hover:text-rose-400"
                      title="Remove Letterhead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              * The uploaded letterhead is fixed at z-index: 0 on the live document preview.
            </div>
          </div>

          {/* UPLOAD ZONE 2: QUOTATION FORMAT & T&CS (DOCX) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    2
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Quotation Format &amp; T&amp;Cs (DOCX)
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Extracts commercial terms &amp; conditions to enforce AI compliance
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleTerms}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  Load Sample T&amp;Cs
                </button>
              </div>

              {docxUploadNotice && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{docxUploadNotice}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={docxInputRef}
                onChange={handleDocxUpload}
                accept=".docx"
                className="hidden"
              />

              <div
                onClick={() => docxInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-slate-700 hover:border-emerald-400/80 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors mb-2">
                  {isExtractingDocx ? (
                    <Sparkles className="w-6 h-6 animate-spin text-emerald-400" />
                  ) : (
                    <FileCheck className="w-6 h-6" />
                  )}
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-emerald-300">
                  {isExtractingDocx ? 'Extracting Text with Mammoth...' : 'Click to Upload .DOCX Template'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                  Upload tender terms (.docx). Extracts raw text &amp; standard T&amp;Cs and saves into master_template_rules.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              * Extracted rules are fed into Qri AI prompt to trigger contextual compliance warnings.
            </div>
          </div>
        </div>

        {/* SECTION 2: MASTER RULES INSPECTOR & LIVE EDITOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Active Master Template Rules (`master_template_rules`)
              </h2>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Directly injected into Qri AI Gemini System Prompt
            </div>
          </div>

          {/* Explanation Alert */}
          <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-lg text-xs text-slate-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <span className="font-bold text-amber-300">Qri AI Commercial Governance Active:</span>
              <p>
                When a user asks for non-standard terms (e.g. <em>&quot;Give 90 days credit&quot;</em>, <em>&quot;12 weeks delivery&quot;</em>, or <em>&quot;0% margin&quot;</em>), Qri will update the live template as requested, but will <strong>automatically trigger a specific compliance warning</strong> in the chat journey log notifying the procurement staff of the policy deviation.
              </p>
            </div>
          </div>

          {/* Editable Textarea */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 font-mono">
              Extracted Rules &amp; Standard Clauses (Editable):
            </label>
            <textarea
              rows={12}
              value={rulesEditorText}
              onChange={(e) => setRulesEditorText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 resize-y"
              placeholder="Paste or extract master template rules here..."
            />
          </div>
        </div>
      </main>

      {/* PDF Preview Modal */}
      {showPdfPreview && globalLetterheadPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[85vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white">Letterhead Preview: {letterheadFileName}</span>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-slate-950">
              <iframe
                src={`${globalLetterheadPdf}#toolbar=0`}
                className="w-full h-full border-0"
                title="Letterhead PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
