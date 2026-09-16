// Inbound ordering rule for contact@ mail.
//
// Forward first, then store. A forward failure propagates so Email Routing
// retries or bounces and the sender learns. A store failure after a
// successful forward is logged and swallowed: the mail has arrived at the
// forwarded copy, and a bounce would say otherwise.

export interface DeliverDeps {
	forward: () => Promise<void>;
	store: () => Promise<void>;
	log: (note: string, error: unknown) => void;
}

export type DeliverOutcome = "stored" | "forwarded-only";

export async function deliver({ forward, store, log }: DeliverDeps): Promise<DeliverOutcome> {
	await forward();
	try {
		await store();
		return "stored";
	} catch (e) {
		log("Stored copy failed after the forward succeeded", e);
		return "forwarded-only";
	}
}

// The mailbox for an inbound message is its envelope recipient, never a
// parsed header: mail with the address in Cc or Bcc, or arriving through a
// list, must still land. An empty allow-list accepts any recipient.
export function pickMailbox(envelopeTo: string, allowed: string[]): string | null {
	const to = envelopeTo.trim().toLowerCase();
	if (!to) return null;
	const list = allowed.map((a) => a.trim().toLowerCase()).filter(Boolean);
	if (list.length === 0) return to;
	return list.includes(to) ? to : null;
}
