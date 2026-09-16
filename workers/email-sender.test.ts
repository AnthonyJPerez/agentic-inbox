import { describe, it, expect } from "vitest";
import { sendEmail, withCopy } from "./email-sender";

describe("withCopy", () => {
	// Annotated so the fixture declares `bcc?` like SendEmailParams does: a bare
	// object literal without it has no property in common with the weak constraint,
	// which tsc rejects (TS2559).
	const base: { to: string; from: string; subject: string; bcc?: string | string[] } =
		{ to: "a@example.com", from: "contact@elided.app", subject: "s" };

	it("returns the params untouched when there is no copy address", () => {
		expect(withCopy(base, undefined)).toBe(base);
	});

	it("adds the copy as the only bcc when there was none", () => {
		expect(withCopy(base, "me@gmail.com").bcc).toEqual(["me@gmail.com"]);
	});

	it("appends the copy to a string bcc", () => {
		expect(withCopy({ ...base, bcc: "x@example.com" }, "me@gmail.com").bcc)
			.toEqual(["x@example.com", "me@gmail.com"]);
	});

	it("appends the copy to an array bcc", () => {
		expect(withCopy({ ...base, bcc: ["x@example.com"] }, "me@gmail.com").bcc)
			.toEqual(["x@example.com", "me@gmail.com"]);
	});

	it("does not duplicate a copy address already present, whatever its case", () => {
		const p = { ...base, bcc: ["Me@Gmail.com"] };
		expect(withCopy(p, "me@gmail.com")).toBe(p);
	});

	it("does not mutate its input", () => {
		const p = { ...base, bcc: ["x@example.com"] };
		withCopy(p, "me@gmail.com");
		expect(p.bcc).toEqual(["x@example.com"]);
	});
});

describe("sendEmail", () => {
	it("hands the binding a message whose bcc carries the copy address", async () => {
		let captured: any = null;
		const binding = { send: async (m: unknown) => { captured = m; return { messageId: "m1" }; } };
		const result = await sendEmail(
			binding as any,
			{ to: "a@example.com", from: "contact@elided.app", subject: "s", text: "t" },
			"me@gmail.com",
		);
		expect(result).toEqual({ messageId: "m1" });
		expect(captured.bcc).toEqual(["me@gmail.com"]);
		expect(captured.to).toBe("a@example.com");
	});
});
