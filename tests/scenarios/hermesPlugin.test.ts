import { defineReflectProperties } from "tests/helpers";
import { HermesMessengerPlugin } from "lib/HermesMessengerPlugin";
import { SmtpProvider, TwilioProvider } from "lib/providers";
import { describe, it, expect } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

describe("HermesMessengerPlugin – default provider registration", () => {
  it("registers the smtp provider without throwing", () => {
    const plugin = new HermesMessengerPlugin();
    expect(() => plugin.getProvider("smtp")).not.toThrow();
  });

  it("registers the twilio provider without throwing", () => {
    const plugin = new HermesMessengerPlugin();
    expect(() => plugin.getProvider("twilio")).not.toThrow();
  });

  it("smtp provider is an instance of SmtpProvider", () => {
    const plugin = new HermesMessengerPlugin();
    expect(plugin.getProvider("smtp")).toBeInstanceOf(SmtpProvider);
  });

  it("twilio provider is an instance of TwilioProvider", () => {
    const plugin = new HermesMessengerPlugin();
    expect(plugin.getProvider("twilio")).toBeInstanceOf(TwilioProvider);
  });

  it("providers return the correct names", () => {
    const plugin = new HermesMessengerPlugin();
    expect(plugin.getProvider("smtp").getName()).toBe("smtp");
    expect(plugin.getProvider("twilio").getName()).toBe("twilio");
  });
});
