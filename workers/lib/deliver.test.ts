import { describe, it, expect, vi } from "vitest";
import { deliver, pickMailbox } from "./deliver";

describe("deliver", () => {
	it("forwards, then stores, and reports stored", async () => {
		const calls: string[] = [];
		const outcome = await deliver({
			forward: async () => { calls.push("forward"); },
			store: async () => { calls.push("store"); },
			log: () => { calls.push("log"); },
		});
		expect(outcome).toBe("stored");
		expect(calls).toEqual(["forward", "store"]);
	});

	it("throws when the forward fails and never stores", async () => {
		const store = vi.fn(async () => {});
		await expect(deliver({
			forward: async () => { throw new Error("forward refused"); },
			store,
			log: () => {},
		})).rejects.toThrow("forward refused");
		expect(store).not.toHaveBeenCalled();
	});

	it("logs and returns forwarded-only when the store fails after a forward", async () => {
		const log = vi.fn();
		const outcome = await deliver({
			forward: async () => {},
			store: async () => { throw new Error("DO unavailable"); },
			log,
		});
		expect(outcome).toBe("forwarded-only");
		expect(log).toHaveBeenCalledTimes(1);
		expect(log.mock.calls[0][1]).toBeInstanceOf(Error);
	});
});

describe("pickMailbox", () => {
	it("returns the envelope recipient when it is on the list, lower-cased", () => {
		expect(pickMailbox("Contact@Elided.app", ["contact@elided.app"])).toBe("contact@elided.app");
	});

	it("returns null when the envelope recipient is not on the list", () => {
		expect(pickMailbox("other@elided.app", ["contact@elided.app"])).toBeNull();
	});

	it("returns the envelope recipient when the list is empty", () => {
		expect(pickMailbox("anyone@elided.app", [])).toBe("anyone@elided.app");
	});

	it("returns null for an empty envelope recipient", () => {
		expect(pickMailbox("", ["contact@elided.app"])).toBeNull();
	});
});
