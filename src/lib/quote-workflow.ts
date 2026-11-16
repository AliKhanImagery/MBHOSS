// ==============================================================================
// Tag + approval workflow for quotations. Pure rules, no screens, no storage:
// every function takes the quote's current workflow and returns the new one
// (or says plainly why the action is not allowed).
//
//   draft -> (tag a colleague) -> with_colleague -> (they hand it back) -> draft
//   draft / sent_back -> (submit) -> needs_approval -> (admin approves) -> approved
//                                                  -> (admin sends back) -> sent_back
//
// Decisions from the owner of the business:
//  - anyone who owns the quote can tag a colleague
//  - the tagged person may change everything, prices included
//  - a quote waiting for approval stays editable; editing an APPROVED quote
//    withdraws the approval (it needs approving again)
//  - only an approved quote can be downloaded (admins can always download)
// ==============================================================================

export type WorkflowStatus = 'draft' | 'with_colleague' | 'needs_approval' | 'approved' | 'sent_back';

export interface Person {
  id: string;
  name: string;
}

export interface LogEntry {
  at: string; // ISO time
  by: Person;
  action: 'created' | 'tagged' | 'handed_back' | 'submitted' | 'approved' | 'sent_back' | 'edited_after_approval';
  note?: string;
}

export interface QuoteWorkflow {
  status: WorkflowStatus;
  owner: Person;
  /** Who is currently asked to fill something in, and what they were asked. */
  assignee?: Person & { note: string; requestedAt: string };
  /** Grand total at the moment it was submitted, so the approver can see if prices changed. */
  submittedTotal?: number;
  approvedBy?: Person;
  approvedAt?: string;
  approvedTotal?: number;
  /** Why the admin sent it back. */
  sentBackNote?: string;
  log: LogEntry[];
}

export interface Actor extends Person {
  isAdmin: boolean;
}

export type Result = { ok: true; workflow: QuoteWorkflow } | { ok: false; reason: string };

const fail = (reason: string): Result => ({ ok: false, reason });
const trim = (s: string) => s.trim().replace(/\s+/g, ' ');

export function startWorkflow(owner: Person, now = new Date()): QuoteWorkflow {
  return { status: 'draft', owner, log: [{ at: now.toISOString(), by: owner, action: 'created' }] };
}

export function tagColleague(w: QuoteWorkflow, actor: Actor, assignee: Person, note: string, now = new Date()): Result {
  if (!actor.isAdmin && actor.id !== w.owner.id) return fail('Only the person who owns this quotation can tag someone.');
  if (assignee.id === actor.id) return fail('Choose a colleague, not yourself.');
  if (w.status === 'with_colleague') return fail(`This quotation is already with ${w.assignee?.name ?? 'a colleague'}.`);
  if (w.status === 'approved') return fail('This quotation is approved. Change something first if it needs more input.');
  const text = trim(note);
  if (!text) return fail('Write what you need them to fill in.');
  const at = now.toISOString();
  return {
    ok: true,
    workflow: {
      ...w,
      status: 'with_colleague',
      assignee: { ...assignee, note: text.slice(0, 500), requestedAt: at },
      log: [...w.log, { at, by: actor, action: 'tagged', note: `${assignee.name}: ${text.slice(0, 500)}` }],
    },
  };
}

export function handBack(w: QuoteWorkflow, actor: Actor, note = '', now = new Date()): Result {
  if (w.status !== 'with_colleague' || !w.assignee) return fail('Nobody is asked to fill anything in on this quotation.');
  if (actor.id !== w.assignee.id && !actor.isAdmin) return fail(`Only ${w.assignee.name} can hand this back.`);
  const { assignee: _gone, ...rest } = w;
  void _gone;
  return {
    ok: true,
    workflow: { ...rest, status: 'draft', log: [...w.log, { at: now.toISOString(), by: actor, action: 'handed_back', note: trim(note).slice(0, 500) || undefined }] },
  };
}

export function submitForApproval(w: QuoteWorkflow, actor: Actor, grandTotal: number, now = new Date()): Result {
  if (!actor.isAdmin && actor.id !== w.owner.id) return fail('Only the person who owns this quotation can send it for approval.');
  if (w.status === 'with_colleague') return fail(`Wait for ${w.assignee?.name ?? 'your colleague'} to hand it back first.`);
  if (w.status === 'needs_approval') return fail('This quotation is already waiting for approval.');
  if (w.status === 'approved') return fail('This quotation is already approved.');
  const { sentBackNote: _n, ...rest } = w;
  void _n;
  return {
    ok: true,
    workflow: { ...rest, status: 'needs_approval', submittedTotal: grandTotal, log: [...w.log, { at: now.toISOString(), by: actor, action: 'submitted' }] },
  };
}

export function approve(w: QuoteWorkflow, actor: Actor, grandTotal: number, now = new Date()): Result {
  if (!actor.isAdmin) return fail('Only an admin can approve a quotation.');
  if (w.status !== 'needs_approval') return fail('This quotation is not waiting for approval.');
  const at = now.toISOString();
  const changed = w.submittedTotal !== undefined && w.submittedTotal !== grandTotal;
  return {
    ok: true,
    workflow: {
      ...w,
      status: 'approved',
      approvedBy: actor,
      approvedAt: at,
      approvedTotal: grandTotal,
      log: [...w.log, { at, by: actor, action: 'approved', note: changed ? `Total changed from ${w.submittedTotal} to ${grandTotal} before approval.` : undefined }],
    },
  };
}

export function sendBack(w: QuoteWorkflow, actor: Actor, reason: string, now = new Date()): Result {
  if (!actor.isAdmin) return fail('Only an admin can send a quotation back.');
  if (w.status !== 'needs_approval') return fail('This quotation is not waiting for approval.');
  const text = trim(reason);
  if (!text) return fail('Say what needs to change.');
  return {
    ok: true,
    workflow: { ...w, status: 'sent_back', sentBackNote: text.slice(0, 500), log: [...w.log, { at: now.toISOString(), by: actor, action: 'sent_back', note: text.slice(0, 500) }] },
  };
}

/**
 * Call after any edit to the quote's content. Editing an approved quotation withdraws
 * the approval; any other state is left as it is (a quote waiting for approval stays editable).
 */
export function afterEdit(w: QuoteWorkflow, actor: Person, now = new Date()): QuoteWorkflow {
  if (w.status !== 'approved') return w;
  const { approvedBy: _a, approvedAt: _t, approvedTotal: _p, ...rest } = w;
  void _a; void _t; void _p;
  return { ...rest, status: 'needs_approval', log: [...w.log, { at: now.toISOString(), by: actor, action: 'edited_after_approval' }] };
}

export const canDownload = (w: QuoteWorkflow | undefined, actor: Actor): boolean => actor.isAdmin || w?.status === 'approved';

/** Quotations waiting on this person (tagged to them), and for admins those waiting for approval. */
export function inboxFor(items: { id: string; workflow?: QuoteWorkflow }[], actor: Actor) {
  return {
    taggedToMe: items.filter((i) => i.workflow?.status === 'with_colleague' && i.workflow.assignee?.id === actor.id),
    needApproval: actor.isAdmin ? items.filter((i) => i.workflow?.status === 'needs_approval') : [],
    sentBackToMe: items.filter((i) => i.workflow?.status === 'sent_back' && i.workflow.owner.id === actor.id),
  };
}

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  with_colleague: 'With a colleague',
  needs_approval: 'Needs approval',
  approved: 'Approved',
  sent_back: 'Sent back',
};
