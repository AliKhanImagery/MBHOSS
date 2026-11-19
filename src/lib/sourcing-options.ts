// Sourcing options: pure helpers + the first list Ali supplied.
// Rules: store only what the source said; leave unknowns empty; never invent an email, phone or capacity.
import type { SourcingOption, SourcingSupplier } from '@/types';

const SRC = 'Google Antigravity research (not yet verified by us)';
const ADDED = '2026-11-19';
const CAT = 'Stainless steel tank fabrication';
const CONFIRM_316L = 'SS 316L and sanitary finish';

export const PUNJAB_TANK_SEED: SourcingOption[] = [
  {
    id: 'so-matrix-engineering',
    companyName: 'Matrix Engineering (Pvt.) Ltd.',
    category: CAT,
    location: 'Lahore',
    address: 'Sundar Industrial Estate & Thokar Niaz Baig, Lahore. Works: 620-B, Sundar Industrial Estate',
    website: 'matrix.net.pk',
    email: 'proposals@matrix.net.pk',
    phone: '+92-42-35297621',
    grades: ['SS 304', 'SS 316'],
    capabilities: 'Hygienic process vessels and food-grade storage tanks, up to 20,000 L, including Unilever Pakistan projects.',
    tier: 'confirmed',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-mech-civ-mccs',
    companyName: 'MECH-CIV Construction Services (MCCS)',
    category: CAT,
    location: 'Lahore',
    website: 'mechcivconstruction.com',
    phone: '+92 321 877 1689',
    grades: ['SS 304', 'SS 316', 'SS 316L'],
    capabilities: 'Food-grade and pharma vessels, 100 L to 50,000 L (industrial up to 500 KL), 3A / GMP / ASME. Jacketed, agitated and CIP-ready designs. Mirror, BA or 2B interior. TIG welded, X-ray tested.',
    tier: 'confirmed',
    flag: 'No email given — contact by phone or through the website.',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-syed-star-engineering',
    companyName: 'Syed Star Engineering (Pvt.) Ltd.',
    category: CAT,
    location: 'Lahore',
    address: 'Chungi Amer Sidhu, Ferozepur Road, Lahore. Gowala Colony Road, Ferozepur Road',
    website: 'syedstarengineering.com',
    email: 'info@syedstarengineering.com',
    phone: '+92 311 9900040 / 042-35815748',
    grades: ['SS 304/304L', 'SS 316/316L'],
    capabilities: 'Dairy, beverage and pharma machinery. Storage tanks, milk chillers, double-jacket syrup tanks, limpet-coil vessels.',
    tier: 'confirmed',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-kashif-engineering',
    companyName: 'Kashif Engineering',
    category: CAT,
    location: 'Okara',
    address: '120 km Lahore–Multan Road, Okara Bypass',
    website: 'kashifengineering.com',
    email: 'info@kashifengineering.com',
    phone: '+92 340 4467153',
    grades: ['SS 304', 'SS 316L'],
    capabilities: 'Dairy equipment, syrup/blending tanks, pharma CIP/WFI tanks, jacketed vessels and reactors.',
    tier: 'confirmed',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-za-qadri-engineering',
    companyName: 'ZA Qadri Engineering Solutions',
    category: CAT,
    location: 'Lahore',
    address: '2 km Defence Road, Near Indus Hospital, Lahore',
    website: 'zaqadriengineering.com',
    email: 'zaqadriengineeringsolution@gmail.com',
    phone: '+92 302 4852348',
    grades: ['SS 304', 'SS 316'],
    capabilities: 'ASME and API 650 storage tanks, drawings, MTCs, weld inspection, hydro test.',
    tier: 'confirmed',
    flag: 'The email is a Gmail address, not a company domain.',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-qecpak',
    companyName: 'QECPAK',
    category: CAT,
    location: 'Lahore',
    address: 'Shahpur Kanjra, Multan Road, Lahore',
    website: 'qecpak.com',
    email: 'info@qecpak.com',
    phone: '+92-42-35410800',
    grades: [],
    capabilities: 'Vertical and horizontal SS storage tanks, ASME pressure vessels, silos, food-grade mixers.',
    tier: 'to_confirm',
    confirmOnRfq: CONFIRM_316L,
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-grand-star-engineering',
    companyName: 'Grand Star Engineering',
    category: CAT,
    location: 'Lahore',
    address: 'Sundar Industrial Estate, Lahore',
    website: 'gstarengineering.com',
    email: 'info@gstareng.com',
    phone: '0300-7774260',
    grades: [],
    capabilities: 'Food-grade SS storage tanks, food equipment, sanitary piping.',
    tier: 'to_confirm',
    confirmOnRfq: CONFIRM_316L,
    flag: 'The email domain (gstareng.com) differs from the website (gstarengineering.com). Check it before sending.',
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-arew-engineering-solutions',
    companyName: 'Arew Engineering Solutions',
    category: CAT,
    location: 'Lahore',
    address: 'Raiwind Road, Lahore',
    website: 'arewengineeringsolutions.com',
    email: 'sales@arewengineeringsolutions.com',
    phone: '+92 333 4642145',
    grades: [],
    capabilities: 'Custom SS storage tanks.',
    tier: 'to_confirm',
    confirmOnRfq: CONFIRM_316L,
    source: SRC,
    addedDate: ADDED,
  },
  {
    id: 'so-zu-engineering',
    companyName: 'ZU Engineering',
    category: CAT,
    location: 'Khanewal',
    website: 'zuengineering.com',
    email: 'info@zuengineering.com',
    phone: '+92 300 5148023',
    grades: [],
    capabilities: 'Jacketed heating, blending and mixing tanks, 50 L to 5,000 L.',
    tier: 'to_confirm',
    confirmOnRfq: CONFIRM_316L,
    source: SRC,
    addedDate: ADDED,
  },
];

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function hasUsableEmail(o: Pick<SourcingOption, 'email'>): boolean {
  return !!o.email && EMAIL_RE.test(o.email.trim());
}

export type SourcingFilter = 'all' | 'confirmed' | 'to_confirm' | 'no_email';

export function filterOptions(list: SourcingOption[], filter: SourcingFilter, term: string): SourcingOption[] {
  const s = term.trim().toLowerCase();
  return list.filter((o) => {
    if (filter === 'confirmed' && o.tier !== 'confirmed') return false;
    if (filter === 'to_confirm' && o.tier !== 'to_confirm') return false;
    if (filter === 'no_email' && hasUsableEmail(o)) return false;
    if (!s) return true;
    return [o.companyName, o.category, o.location, o.address, o.capabilities, o.grades.join(' ')]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(s));
  });
}

/** Options the RFQ dispatcher can email: only those with a real-looking email on file. Nothing is made up. */
export function toSourcingSuppliers(list: SourcingOption[]): { suppliers: SourcingSupplier[]; skipped: SourcingOption[] } {
  const suppliers: SourcingSupplier[] = [];
  const skipped: SourcingOption[] = [];
  for (const o of list) {
    if (!hasUsableEmail(o)) {
      skipped.push(o);
      continue;
    }
    suppliers.push({
      id: o.id,
      companyName: o.companyName,
      email: (o.email as string).trim(),
      phone: o.phone,
      categories: [o.category],
      city: o.location,
    });
  }
  return { suppliers, skipped };
}
