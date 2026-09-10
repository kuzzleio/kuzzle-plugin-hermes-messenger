import { defineReflectProperties } from "tests/helpers";
import { HermesMessengerPlugin } from "lib/HermesMessengerPlugin";
import { BaseProvider, SmtpProvider, TwilioProvider } from "lib/providers";
import { context, TestProvider } from "tests/mocks";
import { describe, it, expect, vi } from "vitest";

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

  it("providers carry their id and display name", () => {
    const plugin = new HermesMessengerPlugin();
    const ids = ["smtp", "twilio", "sendgrid", "smsenvoi"];
    const displayNames = ["SMTP", "Twilio", "SendGrid", "SMS Envoi"];

    for (const [i, id] of ids.entries()) {
      const provider = plugin.getProvider(id);
      expect(provider.getProviderId()).toBe(id);
      expect(provider.getDisplayName()).toBe(displayNames[i]);
      expect(provider.serialize()).toMatchObject({
        providerId: id,
        displayName: displayNames[i],
      });
    }
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

  it("built-in providers declare their message capabilities", () => {
    const plugin = new HermesMessengerPlugin();
    const caps = (key: string) => plugin.getProvider(key).capabilities;

    expect(caps("smtp")).toEqual(["text", "html", "file"]);
    expect(caps("sendgrid")).toEqual(["text", "html", "file"]);
    expect(caps("twilio")).toEqual(["text"]);
    expect(caps("smsenvoi")).toEqual(["text"]);
    expect(
      plugin.providerManager
        .listProviders({ capability: "file" })
        .map((p) => p.getProviderId()),
    ).toEqual(["smtp", "sendgrid"]);
  });

  it("built-in providers all target the human audience", () => {
    const plugin = new HermesMessengerPlugin();

    for (const provider of plugin.providerManager.listProviders()) {
      expect(provider.serialize().audiences).toEqual(["human"]);
    }

    expect(
      plugin.providerManager
        .listProviders({ audience: "human" })
        .map((p) => p.getProviderId()),
    ).toEqual(["smtp", "twilio", "sendgrid", "smsenvoi"]);
    expect(
      plugin.providerManager.listProviders({ audience: "technical" }),
    ).toEqual([]);
  });
});

describe("HermesMessengerPlugin – send params", () => {
  it("built-in providers reject unknown send params", () => {
    const plugin = new HermesMessengerPlugin();

    for (const key of ["smtp", "sendgrid", "twilio", "smsenvoi"]) {
      const provider = plugin.getProvider(key);

      expect(() =>
        provider.validateMessageAdditionalParams({ from: "sender" }),
      ).not.toThrow();
      expect(() =>
        provider.validateMessageAdditionalParams({ replyTo: "x" }),
      ).toThrowError("Send params format does not match");
    }
  });
});

describe("HermesMessengerPlugin – email content format", () => {
  const smtpParams = {
    host_name: "smtp.example.com",
    port: 587,
    user: "u",
    password: "p",
    default_sender: "no-reply@example.com",
  };
  const sendgridParams = {
    api_key: "SG.x",
    default_sender: "no-reply@example.com",
  };

  for (const [key, params] of [
    ["smtp", smtpParams],
    ["sendgrid", sendgridParams],
  ] as const) {
    it(`${key}: accepts an optional format restricted to html or text`, () => {
      const provider = new HermesMessengerPlugin().getProvider(key);

      expect(() =>
        provider.validateMessageContent({ subject: "s", message: "m" }),
      ).not.toThrow();
      expect(() =>
        provider.validateMessageContent({
          subject: "s",
          message: "m",
          format: "text",
        }),
      ).not.toThrow();
      expect(() =>
        provider.validateMessageContent({
          subject: "s",
          message: "m",
          format: "markdown",
        }),
      ).toThrow();
    });

    it(`${key}: sends HTML by default and plain text when format is text`, async () => {
      const provider = new HermesMessengerPlugin().getProvider(key);
      // sendMessage logs through the plugin context, which init() would set
      (provider as any).context = context;
      provider.nodeAddAccount("t", params);
      const deliver = vi
        .spyOn(provider as any, "deliver")
        .mockResolvedValue(undefined);

      await provider.sendMessage("t", ["a@b.co"], {
        subject: "s",
        message: "<b>hi</b>",
      });
      await provider.sendMessage("t", ["a@b.co"], {
        subject: "s",
        message: "hi",
        format: "text",
      });

      expect(deliver.mock.calls[0][1]).toMatchObject({ html: "<b>hi</b>" });
      expect(deliver.mock.calls[0][1]).not.toHaveProperty("text");
      expect(deliver.mock.calls[1][1]).toMatchObject({ text: "hi" });
      expect(deliver.mock.calls[1][1]).not.toHaveProperty("html");
    });
  }
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
