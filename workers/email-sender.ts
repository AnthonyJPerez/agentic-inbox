// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

/**
 * Email sending via Cloudflare Email Service binding.
 *
 * Uses the `send_email` Worker binding (`env.EMAIL.send()`) to send emails.
 *
 * See: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

export interface SendEmailParams {
	to: string | string[];
	from: string | { email: string; name: string };
	subject: string;
	html?: string;
	text?: string;
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string | { email: string; name: string };
	attachments?: {
		content: string; // base64 encoded
		filename: string;
		type: string;
		disposition: "attachment" | "inline";
		contentId?: string;
	}[];
	headers?: Record<string, string>;
}

/**
 * Add the blind-copy address to the recipients, once, keeping any Bcc the
 * caller set. Every send from this Worker carries it so the forwarded-to
 * inbox holds the outbound half of each conversation as well.
 */
export function withCopy<T extends { bcc?: string | string[] }>(params: T, copyTo?: string): T {
	if (!copyTo) return params;
	const existing = params.bcc === undefined ? [] : Array.isArray(params.bcc) ? params.bcc : [params.bcc];
	if (existing.some((a) => a.toLowerCase() === copyTo.toLowerCase())) return params;
	return { ...params, bcc: [...existing, copyTo] };
}

/**
 * Send an email using the Cloudflare Email Service binding.
 *
 * @param binding  - The `EMAIL` SendEmail binding from env
 * @param params   - Email parameters (to, from, subject, body, etc.)
 * @param copyTo - Address blind-copied on every send (the FORWARD_TO secret)
 * @returns The send result with messageId
 * @throws On validation or delivery errors (error has `.code` property)
 */
export async function sendEmail(
	binding: SendEmail,
	params: SendEmailParams,
	copyTo?: string,
): Promise<{ messageId: string }> {
	const p = withCopy(params, copyTo);
	const message: Record<string, unknown> = {
		to: p.to,
		from: p.from,
		subject: p.subject,
	};

	if (p.html) message.html = p.html;
	if (p.text) message.text = p.text;
	if (p.cc) message.cc = p.cc;
	if (p.bcc) message.bcc = p.bcc;
	if (p.replyTo) message.replyTo = p.replyTo;

	if (p.headers && Object.keys(p.headers).length > 0) {
		message.headers = p.headers;
	}

	if (p.attachments && p.attachments.length > 0) {
		message.attachments = p.attachments.map((att) => ({
			content: att.content,
			filename: att.filename,
			type: att.type,
			disposition: att.disposition,
			...(att.contentId ? { contentId: att.contentId } : {}),
		}));
	}

	const result = await binding.send(message as any);
	return { messageId: result.messageId };
}
