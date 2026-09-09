import { defineReflectProperties } from "tests/helpers";
import { HermesMessengerPlugin } from "lib/HermesMessengerPlugin";
import { BaseProvider, SmtpProvider, TwilioProvider } from "lib/providers";
import { TestProvider } from "tests/mocks";
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

describe("HermesMessengerPlugin – built-in recipient types", () => {
  it("registers the email, phoneNumber and uri recipient types", () => {
    const plugin = new HermesMessengerPlugin();

    expect(plugin.listRecipientTypes().map((t) => t.name)).toEqual([
      "email",
      "phoneNumber",
      "uri",
    ]);
  });

  it("filters recipient types on their audience", () => {
    const plugin = new HermesMessengerPlugin();

    expect(
      plugin.listRecipientTypes({ audience: "human" }).map((t) => t.name),
    ).toEqual(["email", "phoneNumber"]);
    expect(
      plugin.listRecipientTypes({ audience: "technical" }).map((t) => t.name),
    ).toEqual(["uri"]);
    expect(plugin.listRecipientTypes({ audience: "nobody" })).toEqual([]);
  });

  it("built-in providers all target the human audience", () => {
    const plugin = new HermesMessengerPlugin();

    for (const provider of plugin.providerManager.listProviders()) {
      expect(provider.serialize().audiences).toEqual(["human"]);
    }

    expect(
      plugin.providerManager
        .listProviders({ audience: "human" })
        .map((p) => p.getName()),
    ).toEqual(["smtp", "twilio", "SendGrid", "SMS Envoi"]);
    expect(
      plugin.providerManager.listProviders({ audience: "technical" }),
    ).toEqual([]);
  });
});

describe("HermesMessengerPlugin – provider registration", () => {
  it("binds the recipient type registry when registering a provider", () => {
    const plugin = new HermesMessengerPlugin();
    const provider = new TestProvider(plugin.recipientTypeRegistry, ["email"]);
    // undo the binding done by the mock so that the plugin has to do it
    provider.bindRecipientTypes = BaseProvider.prototype.bindRecipientTypes;
    (provider as any).recipientTypeRegistry = undefined;

    expect(() => provider.validateRecipients(["a@b.co"])).toThrow();

    plugin.registerProvider("test", provider);

    expect(provider.validateRecipients(["a@b.co"])).toEqual(["email"]);
    expect(() => provider.validateRecipients(["nope"])).toThrow();
  });

  it("rejects a provider referencing an unknown recipient type", () => {
    const plugin = new HermesMessengerPlugin();
    const provider = new TestProvider(undefined, ["testRecipient"]);

    expect(() => plugin.registerProvider("test", provider)).toThrowError(
      'references unknown recipient type "testRecipient"',
    );
  });
});
