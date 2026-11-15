'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  DataBankItem,
  QuotationTemplate,
  QuotationCase,
  ChatMessage,
  QuoteLineItem,
} from '@/types';

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

// Seed 5 realistic industrial items with prices in PKR
export const SEED_DATA_BANK: DataBankItem[] = [
  {
    id: 'db-1',
    company: 'Brandt Industrial Lahore',
    machineName: 'Siemens SIRIUS Contactor Relay 24V DC (3RH2122-1BB40)',
    pricePKR: 14500,
    lastCheckedDate: '2026-11-12',
    category: 'Switchgear & Relays',
    notes: 'Brandreth Rd ready ex-stock, screw terminal, 2NO+2NC',
  },
  {
    id: 'db-2',
    company: 'Al-Madina Switchgear Brandreth Rd',
    machineName: 'Schneider TeSys D Contactor 3P 25A 24V DC (LC1D25BD)',
    pricePKR: 21800,
    lastCheckedDate: '2026-11-10',
    category: 'Switchgear & Relays',
    notes: 'Original box sealed, 11kW AC-3 rating',
  },
  {
    id: 'db-3',
    company: 'Al-Madina Switchgear Brandreth Rd',
    machineName: 'Schneider TeSys D Contactor 9A 220V AC (LC1D09M7)',
    pricePKR: 8200,
    lastCheckedDate: '2026-11-14',
    category: 'Switchgear & Relays',
    notes: 'Standard 220V AC coil, 4kW motor duty',
  },
  {
    id: 'db-4',
    company: 'Pak-German Automation Karachi',
    machineName: 'Siemens SIMATIC S7-1200 CPU 1214C DC/DC/DC (6ES7214-1AG40)',
    pricePKR: 115000,
    lastCheckedDate: '2026-11-08',
    category: 'Automation & PLC',
    notes: '14 DI / 10 DO / 2 AI onboard, 100KB memory',
  },
  {
    id: 'db-5',
    company: 'Brandt Industrial Lahore',
    machineName: 'Schneider Altivar ATV320 1.5kW 2HP VFD Inverter (ATV320U15N4B)',
    pricePKR: 54000,
    lastCheckedDate: '2026-11-13',
    category: 'Variable Speed Drives',
    notes: '3-phase 380-500V compact book format',
  },
];

// Initial default blank/sample quote template
export const DEFAULT_TEMPLATE: QuotationTemplate = {
  quoteRef: 'QT-2026-1001',
  date: new Date().toISOString().split('T')[0],
  validityDays: 7,
  clientName: 'Engro Fertilizers Ltd',
  clientContact: 'Engr. Bilal Shah (Chief Electrical Manager)',
  deliveryTerms: 'Ex-Stock (1-2 Days)',
  paymentTerms: '100% Advance Against Proforma',
  currency: 'PKR',
  taxMode: 'WITHOUT_GST',
  customTaxPct: 0,
  lineItems: [
    {
      id: 'item-1',
      description: 'Siemens SIRIUS Contactor Relay 24V DC, 2NO+2NC',
      brand: 'Siemens',
      partNumber: '3RH2122-1BB40',
      qty: 5,
      uom: 'PCS',
      unitCost: 14500,
      marginPct: 15,
      unitPrice: 16675,
      total: 83375,
    },
  ],
  subtotal: 83375,
  taxAmount: 0,
  grandTotal: 83375,
  notes: [
    'Quotation valid for 7 calendar days due to import rate fluctuation.',
    'Warranty: 12 months standard manufacturer warranty against manufacturing defects.',
    'Carriage: Delivered to client site via verified courier service.',
  ],
};

interface AppContextType {
  // Auth
  currentUser: User | null;
  loginAsAliKhan: () => void;
  logout: () => void;

  // Data Bank
  dataBank: DataBankItem[];
  addDataBankItem: (item: Omit<DataBankItem, 'id'>) => void;
  updateDataBankItem: (id: string, item: Partial<DataBankItem>) => void;
  deleteDataBankItem: (id: string) => void;
  resetDataBank: () => void;

  // Users Management
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUserFeatures: (userId: string, features: Partial<User['features']>) => void;

  // Quotation Template State
  templateState: QuotationTemplate;
  setTemplateState: React.Dispatch<React.SetStateAction<QuotationTemplate>>;
  updateTemplateField: <K extends keyof QuotationTemplate>(field: K, value: QuotationTemplate[K]) => void;
  updateLineItem: (itemId: string, updates: Partial<QuoteLineItem>) => void;
  addLineItem: (item?: Partial<QuoteLineItem>) => void;
  removeLineItem: (itemId: string) => void;
  recalculateTotals: (base?: QuotationTemplate) => void;

  // Active Cases
  activeCases: QuotationCase[];
  saveCurrentCase: (status?: QuotationCase['status']) => void;
  loadCase: (caseId: string) => void;
  deleteCase: (caseId: string) => void;

  // Chat History
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
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

  // 2. Data Bank State
  const [dataBank, setDataBank] = useState<DataBankItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_databank');
      return stored ? JSON.parse(stored) : SEED_DATA_BANK;
    }
    return SEED_DATA_BANK;
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
  };

  const updateDataBankItem = (id: string, updates: Partial<DataBankItem>) => {
    setDataBank((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteDataBankItem = (id: string) => {
    setDataBank((prev) => prev.filter((item) => item.id !== id));
  };

  const resetDataBank = () => {
    setDataBank(SEED_DATA_BANK);
  };

  // 3. User Management State
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

  // 4. Quotation Template State
  const [templateState, setTemplateState] = useState<QuotationTemplate>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_current_template');
      return stored ? JSON.parse(stored) : DEFAULT_TEMPLATE;
    }
    return DEFAULT_TEMPLATE;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_current_template', JSON.stringify(templateState));
    }
  }, [templateState]);

  // Recalculates Subtotal, Taxes, and Grand Total accurately
  const recalculateTotals = (base?: QuotationTemplate) => {
    const target = base || templateState;
    const subtotal = target.lineItems.reduce((acc, item) => acc + (item.total || 0), 0);

    let taxPct = 0;
    if (target.taxMode === 'GST_18') {
      taxPct = 18;
    } else if (target.taxMode === 'CUSTOM') {
      taxPct = target.customTaxPct || 0;
    }

    const taxAmount = Math.round(subtotal * (taxPct / 100));
    const grandTotal = subtotal + taxAmount;

    const updated: QuotationTemplate = {
      ...target,
      subtotal,
      taxAmount,
      grandTotal,
    };

    setTemplateState(updated);
  };

  const updateTemplateField = <K extends keyof QuotationTemplate>(
    field: K,
    value: QuotationTemplate[K]
  ) => {
    setTemplateState((prev) => {
      const next = { ...prev, [field]: value };
      // If taxMode changed, trigger recalculation
      if (field === 'taxMode' || field === 'customTaxPct') {
        const subtotal = next.lineItems.reduce((acc, item) => acc + (item.total || 0), 0);
        let taxPct = 0;
        if (next.taxMode === 'GST_18') taxPct = 18;
        else if (next.taxMode === 'CUSTOM') taxPct = next.customTaxPct || 0;
        const taxAmount = Math.round(subtotal * (taxPct / 100));
        next.subtotal = subtotal;
        next.taxAmount = taxAmount;
        next.grandTotal = subtotal + taxAmount;
      }
      return next;
    });
  };

  const updateLineItem = (itemId: string, updates: Partial<QuoteLineItem>) => {
    setTemplateState((prev) => {
      const nextLines = prev.lineItems.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };

          // If qty, unitCost, or marginPct changed, recalculate unitPrice and total
          if (
            updates.qty !== undefined ||
            updates.unitCost !== undefined ||
            updates.marginPct !== undefined
          ) {
            const cost = updatedItem.unitCost || 0;
            const margin = updatedItem.marginPct || 0;
            const unitPrice = Math.round(cost * (1 + margin / 100));
            updatedItem.unitPrice = unitPrice;
            updatedItem.total = (updatedItem.qty || 1) * unitPrice;
          } else if (updates.unitPrice !== undefined) {
            // User manually overrode unit price
            updatedItem.total = (updatedItem.qty || 1) * (updatedItem.unitPrice || 0);
          }

          return updatedItem;
        }
        return item;
      });

      const subtotal = nextLines.reduce((acc, item) => acc + (item.total || 0), 0);
      let taxPct = 0;
      if (prev.taxMode === 'GST_18') taxPct = 18;
      else if (prev.taxMode === 'CUSTOM') taxPct = prev.customTaxPct || 0;
      const taxAmount = Math.round(subtotal * (taxPct / 100));

      return {
        ...prev,
        lineItems: nextLines,
        subtotal,
        taxAmount,
        grandTotal: subtotal + taxAmount,
      };
    });
  };

  const addLineItem = (customProps?: Partial<QuoteLineItem>) => {
    const newItem: QuoteLineItem = {
      id: `item-${Date.now()}`,
      description: customProps?.description || 'New Industrial Item',
      brand: customProps?.brand || 'Generic',
      partNumber: customProps?.partNumber || 'PART-001',
      qty: customProps?.qty || 1,
      uom: customProps?.uom || 'PCS',
      unitCost: customProps?.unitCost || 10000,
      marginPct: customProps?.marginPct || 15,
      unitPrice: customProps?.unitPrice || 11500,
      total: (customProps?.qty || 1) * (customProps?.unitPrice || 11500),
    };

    setTemplateState((prev) => {
      const nextLines = [...prev.lineItems, newItem];
      const subtotal = nextLines.reduce((acc, item) => acc + (item.total || 0), 0);
      let taxPct = 0;
      if (prev.taxMode === 'GST_18') taxPct = 18;
      else if (prev.taxMode === 'CUSTOM') taxPct = prev.customTaxPct || 0;
      const taxAmount = Math.round(subtotal * (taxPct / 100));

      return {
        ...prev,
        lineItems: nextLines,
        subtotal,
        taxAmount,
        grandTotal: subtotal + taxAmount,
      };
    });
  };

  const removeLineItem = (itemId: string) => {
    setTemplateState((prev) => {
      const nextLines = prev.lineItems.filter((i) => i.id !== itemId);
      const subtotal = nextLines.reduce((acc, item) => acc + (item.total || 0), 0);
      let taxPct = 0;
      if (prev.taxMode === 'GST_18') taxPct = 18;
      else if (prev.taxMode === 'CUSTOM') taxPct = prev.customTaxPct || 0;
      const taxAmount = Math.round(subtotal * (taxPct / 100));

      return {
        ...prev,
        lineItems: nextLines,
        subtotal,
        taxAmount,
        grandTotal: subtotal + taxAmount,
      };
    });
  };

  // 5. Active Cases State
  const [activeCases, setActiveCases] = useState<QuotationCase[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_active_cases');
      if (stored) return JSON.parse(stored);
    }
    return [
      {
        id: 'case-1',
        caseRef: 'QT-2026-1001',
        clientName: 'Engro Fertilizers Ltd',
        status: 'Draft',
        createdAt: '2026-11-15',
        totalPKR: 83375,
        itemCount: 1,
        templateState: DEFAULT_TEMPLATE,
      },
      {
        id: 'case-2',
        caseRef: 'QT-2026-0988',
        clientName: 'Packages Mall Lahore',
        status: 'Sourcing',
        createdAt: '2026-11-14',
        totalPKR: 215000,
        itemCount: 3,
        templateState: DEFAULT_TEMPLATE,
      },
      {
        id: 'case-3',
        caseRef: 'QT-2026-0975',
        clientName: 'Fauji Fertilizer Bin Qasim',
        status: 'Completed',
        createdAt: '2026-11-10',
        totalPKR: 450000,
        itemCount: 8,
        templateState: DEFAULT_TEMPLATE,
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_active_cases', JSON.stringify(activeCases));
    }
  }, [activeCases]);

  const saveCurrentCase = (status: QuotationCase['status'] = 'Draft') => {
    const existingIndex = activeCases.findIndex((c) => c.caseRef === templateState.quoteRef);
    const updatedCase: QuotationCase = {
      id: existingIndex >= 0 ? activeCases[existingIndex].id : `case-${Date.now()}`,
      caseRef: templateState.quoteRef,
      clientName: templateState.clientName || 'Untitled Client',
      status,
      createdAt: new Date().toISOString().split('T')[0],
      totalPKR: templateState.grandTotal,
      itemCount: templateState.lineItems.length,
      templateState: { ...templateState },
    };

    if (existingIndex >= 0) {
      setActiveCases((prev) => {
        const next = [...prev];
        next[existingIndex] = updatedCase;
        return next;
      });
    } else {
      setActiveCases((prev) => [updatedCase, ...prev]);
    }
  };

  const loadCase = (caseId: string) => {
    const targetCase = activeCases.find((c) => c.id === caseId);
    if (targetCase && targetCase.templateState) {
      setTemplateState({ ...targetCase.templateState });
      addChatMessage({
        sender: 'system',
        text: `Loaded quotation case: ${targetCase.caseRef} (${targetCase.clientName}). Right pane updated.`,
      });
    }
  };

  const deleteCase = (caseId: string) => {
    setActiveCases((prev) => prev.filter((c) => c.id !== caseId));
  };

  // 6. Chat History State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('qri_chat_history');
      if (stored) return JSON.parse(stored);
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'agent',
        text: 'Assalam-o-Alaikum! I am Qri AI, your procurement router and quotation builder. I am connected to your Data Bank. What quotation would you like to prepare or modify today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Add 5 Siemens 24V Relays for Engro with 15% margin',
          'Add 3 Schneider 25A Contactors with 20% margin',
          'Apply 18% GST to this quote',
          'Change delivery terms to Ex-Stock Lahore',
        ],
      },
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qri_chat_history', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const addChatMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: 'Chat history cleared. I am ready for your next quotation instruction.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        loginAsAliKhan,
        logout,
        dataBank,
        addDataBankItem,
        updateDataBankItem,
        deleteDataBankItem,
        resetDataBank,
        users,
        addUser,
        updateUserFeatures,
        templateState,
        setTemplateState,
        updateTemplateField,
        updateLineItem,
        addLineItem,
        removeLineItem,
        recalculateTotals,
        activeCases,
        saveCurrentCase,
        loadCase,
        deleteCase,
        chatMessages,
        addChatMessage,
        clearChat,
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
