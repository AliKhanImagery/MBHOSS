'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  DataBankItem,
  QuotationTemplate,
  QuotationCase,
  ChatMessage,
  QuoteLineItem,
  OfficeTemplate,
} from '@/types';
import { blankQuote, recalc } from '@/lib/quote-engine';
import type { TemplateDraft } from '@/lib/docx-template';
import {
  fetchDatabankFromCloud,
  syncDatabankItemToCloud,
  deleteDatabankItemFromCloud,
  fetchCasesFromCloud,
  syncCaseToCloud,
  deleteCaseFromCloud,
  fetchTemplateSettingsFromCloud,
  syncTemplateSettingsToCloud,
  fetchTeamMembersFromCloud,
  syncQuotationToCloud,
} from '@/lib/supabase';

// Default initial user for the bypass login
export const DEFAULT_USER: User = {
  id: 'usr-ali-khan',
  name: 'Ali Khan',
  email: 'ali.khan@qriprocurement.com',
  role: 'Super Admin',
  avatar: 'AK',
  features: {
    directPdfExport: true,
    dataBankWrite: true,
    marginOverride: true,
    whatsappBot: true,
  },
};

// The Data Bank starts empty. Prices only ever come from real entries made by the team.
export const SEED_DATA_BANK: DataBankItem[] = [];

// Demo records that earlier builds seeded into every browser. They are removed once,
// and only when they are still exactly the untouched demo values.
const DEMO_BANK_IDS = ['db-1', 'db-2', 'db-3', 'db-4', 'db-5'];
const DEMO_BANK_COMPANIES = ['Brandt Industrial Lahore', 'Al-Madina Switchgear Brandreth Rd', 'Pak-German Automation Karachi'];
const DEMO_CASE_IDS = ['case-1', 'case-2', 'case-3'];

const OFFICE_PREFIX = 'OFFICE_TEMPLATE_V1:';
const OFFICE_LS_KEY = 'qri_office_template_v1';
const MAX_UNDO = 30;

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

interface AppContextType {
  // Auth
  currentUser: User | null;
  isAdmin: boolean;
  loginAsAliKhan: () => void;
  logout: () => void;

  // Office template — published by an admin, used as-is by everyone
  officeTemplate: OfficeTemplate | null;
  publishTemplate: (draft: TemplateDraft) => Promise<{ ok: boolean; savedToCloud: boolean }>;

  // Data Bank
  dataBank: DataBankItem[];
  addDataBankItem: (item: Omit<DataBankItem, 'id'>) => void;
  updateDataBankItem: (id: string, item: Partial<DataBankItem>) => void;
  deleteDataBankItem: (id: string) => void;

  // Users Management
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUserFeatures: (userId: string, features: Partial<User['features']>) => void;

  // Current quotation. Every change goes through the quote engine (recalc), never ad-hoc maths.
  templateState: QuotationTemplate;
  startNewQuote: () => void;
  applyQuote: (next: QuotationTemplate) => void; // used by the assistant; undoable
  updateTemplateField: <K extends keyof QuotationTemplate>(field: K, value: QuotationTemplate[K]) => void;
  updateLineItem: (itemId: string, updates: Partial<QuoteLineItem>) => void;
  addLineItem: () => void;
  removeLineItem: (itemId: string) => void;
  undoQuote: () => void;
  canUndo: boolean;

  // Saved quotes
  activeCases: QuotationCase[];
  saveCurrentCase: (status?: QuotationCase['status']) => boolean;
  loadCase: (caseId: string) => void;
  deleteCase: (caseId: string) => void;

  // Assistant chat (belongs to the quote being edited)
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;

  // Cloud Synchronization (Supabase)
  cloudStatus: 'connected' | 'syncing' | 'offline';
  refreshFromCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // 1. Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_user');
      return stored ? JSON.parse(stored) : DEFAULT_USER; // Default logged in for fast dev
    }
    return DEFAULT_USER;
  });
  // NOTE: "admin" is only enforced in the screens for now. There is no real sign-in yet,
  // so this is a convenience guard, not security.
  const isAdmin = currentUser?.role === 'Super Admin';

  const loginAsAliKhan = () => {
    setCurrentUser(DEFAULT_USER);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_user', JSON.stringify(DEFAULT_USER));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qri_user');
    }
  };

  // 2. Office template (admin-published, versioned)
  const [officeTemplate, setOfficeTemplate] = useState<OfficeTemplate | null>(() => readJson<OfficeTemplate>(OFFICE_LS_KEY));

  const persistOfficeLocally = (t: OfficeTemplate) => {
    if (!writeJson(OFFICE_LS_KEY, t)) {
      // Large letterhead PDFs can exceed browser storage; keep everything else.
      writeJson(OFFICE_LS_KEY, { ...t, letterhead: { ...t.letterhead, backgroundPdfDataUrl: null } });
    }
  };

  const pushOfficeToCloud = (t: OfficeTemplate): Promise<boolean> => {
    const lite: OfficeTemplate = { ...t, letterhead: { ...t.letterhead, backgroundPdfDataUrl: null } };
    return syncTemplateSettingsToCloud(
      OFFICE_PREFIX + JSON.stringify(lite),
      t.letterhead.backgroundPdfName,
      t.letterhead.backgroundPdfDataUrl
    );
  };

  const publishTemplate = async (draft: TemplateDraft) => {
    if (!isAdmin || !currentUser) return { ok: false, savedToCloud: false };
    const next: OfficeTemplate = {
      ...draft,
      version: (officeTemplate?.version ?? 0) + 1,
      publishedAt: new Date().toISOString(),
      publishedBy: currentUser.name,
    };
    setOfficeTemplate(next);
    persistOfficeLocally(next);
    const savedToCloud = await pushOfficeToCloud(next);
    return { ok: true, savedToCloud };
  };

  // Cloud Synchronization State (Supabase)
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');

  const refreshFromCloud = async () => {
    setCloudStatus('syncing');
    try {
      const [cloudDb, cloudCases, cloudSettings, cloudUsers] = await Promise.all([
        fetchDatabankFromCloud(),
        fetchCasesFromCloud(),
        fetchTemplateSettingsFromCloud(),
        fetchTeamMembersFromCloud(),
      ]);

      if (cloudDb && cloudDb.length > 0) {
        setDataBank(cloudDb);
      }
      if (cloudCases && cloudCases.length > 0) {
        setActiveCases(cloudCases);
      }
      // Only the new, versioned office-template format is accepted from the cloud. Older rows
      // (free-text "master rules") are ignored on purpose.
      if (cloudSettings?.masterRules?.startsWith(OFFICE_PREFIX)) {
        try {
          const cloudTpl = JSON.parse(cloudSettings.masterRules.slice(OFFICE_PREFIX.length)) as OfficeTemplate;
          const local = readJson<OfficeTemplate>(OFFICE_LS_KEY);
          if (!local || cloudTpl.version >= local.version) {
            const merged: OfficeTemplate = {
              ...cloudTpl,
              letterhead: {
                ...cloudTpl.letterhead,
                backgroundPdfDataUrl: cloudSettings.letterheadPdfBase64 ?? local?.letterhead.backgroundPdfDataUrl ?? null,
              },
            };
            setOfficeTemplate(merged);
            persistOfficeLocally(merged);
          } else {
            void pushOfficeToCloud(local); // this computer has a newer one that never reached the cloud
          }
        } catch {
          console.warn('[AppContext] Ignored an unreadable template from the cloud.');
        }
      }
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        if (typeof window !== 'undefined') localStorage.setItem('qri_users_list', JSON.stringify(cloudUsers));
      }
      setCloudStatus('connected');
    } catch (err) {
      console.warn('[AppContext] Cloud sync error:', err);
      setCloudStatus('offline');
    }
  };

  useEffect(() => {
    refreshFromCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Data Bank State
  const [dataBank, setDataBank] = useState<DataBankItem[]>(() => {
    const stored = readJson<DataBankItem[]>('qri_databank');
    if (!stored) return SEED_DATA_BANK;
    // Remove the old built-in demo items (once), keep anything the team really entered.
    return stored.filter((d) => !(DEMO_BANK_IDS.includes(d.id) && DEMO_BANK_COMPANIES.includes(d.company)));
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_databank', JSON.stringify(dataBank));
    }
  }, [dataBank]);

  const addDataBankItem = (item: Omit<DataBankItem, 'id'>) => {
    const newItem: DataBankItem = {
      ...item,
      id: `db-${Date.now()}`,
    };
    setDataBank((prev) => [newItem, ...prev]);
    syncDatabankItemToCloud(newItem);
  };

  const updateDataBankItem = (id: string, updates: Partial<DataBankItem>) => {
    setDataBank((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          syncDatabankItemToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteDataBankItem = (id: string) => {
    setDataBank((prev) => prev.filter((item) => item.id !== id));
    deleteDatabankItemFromCloud(id);
  };

  // 4. User Management State
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_users_list');
      if (stored) return JSON.parse(stored);
    }
    return [
      DEFAULT_USER,
      {
        id: 'usr-tariq',
        name: 'Tariq Mehmood',
        email: 'tariq@qriprocurement.com',
        role: 'Super Admin',
        avatar: 'TM',
        features: {
          directPdfExport: true,
          dataBankWrite: true,
          marginOverride: true,
          whatsappBot: true,
        },
      },
      {
        id: 'usr-hamza',
        name: 'Hamza Rauf',
        email: 'hamza.rauf@qriprocurement.com',
        role: 'Procurement Engineer',
        avatar: 'HR',
        features: {
          directPdfExport: true,
          dataBankWrite: false,
          marginOverride: false,
          whatsappBot: true,
        },
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_users_list', JSON.stringify(users));
    }
  }, [users]);

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      avatar: userData.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUserFeatures = (userId: string, features: Partial<User['features']>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, features: { ...u.features, ...features } } : u))
    );
  };

  // 5. Current quotation
  const [templateState, setTemplateStateRaw] = useState<QuotationTemplate>(() => {
    const stored = readJson<QuotationTemplate>('qri_current_template');
    // Drop the old built-in demo quote (Engro) that earlier builds put in every browser.
    if (!stored || (stored.quoteRef === 'QT-2026-1001' && stored.clientName === 'Engro Fertilizers Ltd')) {
      return blankQuote(null);
    }
    return recalc(stored);
  });
  const [undoStack, setUndoStack] = useState<QuotationTemplate[]>([]);
  const quoteRef = useRef(templateState);
  quoteRef.current = templateState;

  const commitQuote = (next: QuotationTemplate, undoable = true) => {
    const prev = quoteRef.current;
    const finalQuote = recalc({ ...next, templateVersion: next.templateVersion ?? officeTemplate?.version });
    if (undoable) setUndoStack((st) => [...st.slice(-(MAX_UNDO - 1)), prev]);
    quoteRef.current = finalQuote;
    setTemplateStateRaw(finalQuote);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_current_template', JSON.stringify(templateState));
    }
    const timer = setTimeout(() => {
      // Only sync quotes that have a number; an unnumbered draft has no identity yet.
      if (templateState.quoteRef.trim()) syncQuotationToCloud(templateState);
    }, 1200);
    return () => clearTimeout(timer);
  }, [templateState]);

  const applyQuote = (next: QuotationTemplate) => commitQuote(next, true);

  const updateTemplateField = <K extends keyof QuotationTemplate>(field: K, value: QuotationTemplate[K]) => {
    commitQuote({ ...quoteRef.current, [field]: value }, false);
  };

  const updateLineItem = (itemId: string, updates: Partial<QuoteLineItem>) => {
    const cur = quoteRef.current;
    const lineItems = cur.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const u = { ...item, ...updates };
      // Cost or margin changed → price follows. Price typed directly → keep it (manual override).
      if ((updates.unitCost !== undefined || updates.marginPct !== undefined) && updates.unitPrice === undefined && u.unitCost > 0) {
        u.unitPrice = Math.round(u.unitCost * (1 + (u.marginPct || 0) / 100));
      }
      return u;
    });
    commitQuote({ ...cur, lineItems }, false);
  };

  // A blank row for hand-typed items. Nothing is pre-filled except quantity 1.
  const addLineItem = () => {
    const cur = quoteRef.current;
    const line: QuoteLineItem = {
      id: `item-${Date.now()}`,
      description: '',
      brand: '',
      partNumber: '',
      qty: 1,
      uom: 'PCS',
      unitCost: 0,
      marginPct: 0,
      unitPrice: 0,
      total: 0,
    };
    commitQuote({ ...cur, lineItems: [...cur.lineItems, line] });
  };

  const removeLineItem = (itemId: string) => {
    const cur = quoteRef.current;
    commitQuote({ ...cur, lineItems: cur.lineItems.filter((i) => i.id !== itemId) });
  };

  const undoQuote = () => {
    setUndoStack((st) => {
      if (st.length === 0) return st;
      const prev = st[st.length - 1];
      quoteRef.current = prev;
      setTemplateStateRaw(prev);
      return st.slice(0, -1);
    });
  };

  // 6. Chat (per quote)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => readJson<ChatMessage[]>('qri_chat_v2') ?? []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_chat_v2', JSON.stringify(chatMessages.slice(-60)));
    }
  }, [chatMessages]);

  const addChatMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  const clearChat = () => setChatMessages([]);

  const startNewQuote = () => {
    const fresh = blankQuote(officeTemplate?.rules ?? null, officeTemplate?.version);
    quoteRef.current = fresh;
    setTemplateStateRaw(fresh);
    setUndoStack([]);
    setChatMessages([]);
  };

  // 7. Saved quotes
  const [activeCases, setActiveCases] = useState<QuotationCase[]>(() => {
    const stored = readJson<QuotationCase[]>('qri_active_cases');
    if (!stored) return [];
    // Remove the three built-in demo cases (once); real saved quotes are kept.
    return stored.filter((c) => !(DEMO_CASE_IDS.includes(c.id) && ['Engro Fertilizers Ltd', 'Packages Mall Lahore', 'Fauji Fertilizer Bin Qasim'].includes(c.clientName)));
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_active_cases', JSON.stringify(activeCases));
    }
  }, [activeCases]);

  const saveCurrentCase = (status: QuotationCase['status'] = 'Draft'): boolean => {
    const q = quoteRef.current;
    if (!q.quoteRef.trim()) return false; // a saved quote needs its number
    const existingIndex = activeCases.findIndex((c) => c.caseRef === q.quoteRef);
    const updatedCase: QuotationCase = {
      id: existingIndex >= 0 ? activeCases[existingIndex].id : `case-${Date.now()}`,
      caseRef: q.quoteRef,
      clientName: q.clientName || 'Untitled Client',
      status,
      createdAt: new Date().toISOString().split('T')[0],
      totalPKR: q.grandTotal,
      itemCount: q.lineItems.length,
      templateState: { ...q },
    };

    setActiveCases((prev) => {
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = updatedCase;
        return next;
      }
      return [updatedCase, ...prev];
    });

    syncCaseToCloud(updatedCase);
    syncQuotationToCloud(q);
    return true;
  };

  const loadCase = (caseId: string) => {
    const target = activeCases.find((c) => c.id === caseId);
    if (target?.templateState) {
      const loaded = recalc({ ...target.templateState });
      quoteRef.current = loaded;
      setTemplateStateRaw(loaded);
      setUndoStack([]);
      setChatMessages([]);
    }
  };

  const deleteCase = (caseId: string) => {
    setActiveCases((prev) => prev.filter((c) => c.id !== caseId));
    deleteCaseFromCloud(caseId);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAdmin,
        loginAsAliKhan,
        logout,
        officeTemplate,
        publishTemplate,
        dataBank,
        addDataBankItem,
        updateDataBankItem,
        deleteDataBankItem,
        users,
        addUser,
        updateUserFeatures,
        templateState,
        startNewQuote,
        applyQuote,
        updateTemplateField,
        updateLineItem,
        addLineItem,
        removeLineItem,
        undoQuote,
        canUndo: undoStack.length > 0,
        activeCases,
        saveCurrentCase,
        loadCase,
        deleteCase,
        chatMessages,
        addChatMessage,
        clearChat,
        cloudStatus,
        refreshFromCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
