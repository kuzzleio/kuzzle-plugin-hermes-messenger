import { defineReflectProperties } from "tests/helpers";
import { context, TestProvider } from "tests/mocks";
import { RecipientTypeDefinition, RecipientTypeRegistry } from "lib/recipients";
import { describe, it, expect, vi } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

describe("TestProvider", () => {
  it("Register an account", async () => {
    const testProvider = new TestProvider();

    const addAccountSpy = vi.spyOn(testProvider, "addAccount");
    const nodeAddAccountSpy = vi.spyOn(testProvider, "nodeAddAccount");
    const createAccountSpy = vi.spyOn(testProvider, "_createAccount");

    testProvider.addAccount("myaccount", { option: "myoptions" });

    expect(addAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });
    expect(nodeAddAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });
    expect(createAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });

    addAccountSpy.mockRestore();
    nodeAddAccountSpy.mockRestore();
  });

  it("Remove an account", async () => {
    const testProvider = new TestProvider();

    testProvider.addAccount("myaccount", { option: "myoptions" });

    const removeAccountSpy = vi.spyOn(testProvider, "removeAccount");
    const nodeRemoveAccountSpy = vi.spyOn(testProvider, "nodeRemoveAccount");

    testProvider.removeAccount("myaccount");

    expect(removeAccountSpy).toHaveBeenCalledWith("myaccount");
    expect(nodeRemoveAccountSpy).toHaveBeenCalledWith("myaccount");

    removeAccountSpy.mockRestore();
    nodeRemoveAccountSpy.mockRestore();
  });

  it("Remove an account that does not exist", () => {
    const testProvider = new TestProvider();

    const removeAccountSpy = vi.spyOn(testProvider, "removeAccount");

    expect(() => testProvider.removeAccount("notFound")).toThrowError(
      'TestProvider account "notFound" does not exists.',
    );

    expect(removeAccountSpy).toHaveBeenCalledWith("notFound");

    removeAccountSpy.mockRestore();
  });

  it("Get an account", async () => {
    const testProvider = new TestProvider();

    const getAccountSpy = vi.spyOn(testProvider, "getAccount");

    testProvider.addAccount("myaccount", { option: "myoptions" });
    const account = testProvider.getAccount("myaccount");

    expect(getAccountSpy).toHaveBeenCalledWith("myaccount");
    expect(account.name).toBe("myaccount");

    getAccountSpy.mockRestore();
  });

  it("Get an account that does not exist", () => {
    const testProvider = new TestProvider();

    const getAccountSpy = vi.spyOn(testProvider, "getAccount");

    expect(() => testProvider.getAccount("notFound")).toThrowError(
      'Account "notFound" does not exists',
    );

    expect(getAccountSpy).toHaveBeenCalledWith("notFound");

    getAccountSpy.mockRestore();
  });

  it("List accounts", async () => {
    const testProvider = new TestProvider();

    const listAccountsSpy = vi.spyOn(testProvider, "listAccounts");

    testProvider.listAccounts();

    expect(listAccountsSpy).toHaveBeenCalledWith();

    listAccountsSpy.mockRestore();
  });

  it("Validate params", async () => {
    const testProvider = new TestProvider();

    const validateParamsSpy = vi.spyOn(testProvider, "validateAccountParams");

    testProvider.validateAccountParams({ type: "object" });

    expect(validateParamsSpy).toHaveBeenCalledWith({ type: "object" });

    validateParamsSpy.mockRestore();
  });

  it("Validate recipients", async () => {
    const testProvider = new TestProvider();

    const validateRecipientsSpy = vi.spyOn(testProvider, "validateRecipients");

    expect(testProvider.validateRecipients(["anything"])).toEqual([
      "testRecipient",
    ]);

    expect(validateRecipientsSpy).toHaveBeenCalledWith(["anything"]);

    validateRecipientsSpy.mockRestore();
  });

  it("Validate message content", async () => {
    const testProvider = new TestProvider();

    const validateContentSpy = vi.spyOn(testProvider, "validateMessageContent");

    testProvider.validateMessageContent({ type: "object" });

    expect(validateContentSpy).toHaveBeenCalledWith({ type: "object" });

    validateContentSpy.mockRestore();
  });

  it("Get name", async () => {
    const testProvider = new TestProvider();

    const getNameSpy = vi.spyOn(testProvider, "getName");

    testProvider.getName();

    expect(getNameSpy).toHaveBeenCalledWith();

    getNameSpy.mockRestore();
  });

  it("Get account params schema", async () => {
    const testProvider = new TestProvider();

    const getNameSpy = vi.spyOn(testProvider, "getAccountParamsSchema");

    testProvider.getAccountParamsSchema();

    expect(getNameSpy).toHaveBeenCalledWith();

    getNameSpy.mockRestore();
  });

  it("Send a message", async () => {
    const testProvider = new TestProvider();

    const sendSpy = vi.spyOn(testProvider, "sendMessage");

    const accountName = "myaccount";
    const recipients = ["recipient1"];
    const content = { text: "mycontent" };

    await testProvider.sendMessage(accountName, recipients, content);

    expect(sendSpy).toHaveBeenCalledWith(accountName, recipients, content);

    sendSpy.mockRestore();
  });

  it("Init", async () => {
    const testProvider = new TestProvider();

    const initSpy = vi.spyOn(testProvider, "init");
    const nodeAddAccountSpy = vi.spyOn(testProvider, "nodeAddAccount");
    const nodeRemoveAccountSpy = vi.spyOn(testProvider, "nodeRemoveAccount");

    await testProvider.init({}, context);

    expect(initSpy).toHaveBeenCalledWith({}, context);

    testProvider.addAccount("myaccount", { option: "myoptions" });

    expect(nodeAddAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });

    testProvider.removeAccount("myaccount");
    expect(nodeRemoveAccountSpy).toHaveBeenCalledWith("myaccount");

    initSpy.mockRestore();
  });

  describe("Custom recipient type registration", () => {
    const webhookRecipient: RecipientTypeDefinition = {
      name: "webhookUrl",
      description: "An HTTP endpoint to POST the message to",
      audiences: ["technical"],
      jsonSchema: { type: "string", format: "uri" },
    };

    it("accepts a provider referencing a custom registered recipient type", () => {
      const registry = new RecipientTypeRegistry();
      registry.register(webhookRecipient);

      const testProvider = new TestProvider(registry, ["webhookUrl"]);

      expect(testProvider.getAcceptedRecipientTypes()).toEqual(["webhookUrl"]);
      expect(
        testProvider.validateRecipients(["https://example.com/hook"]),
      ).toEqual(["webhookUrl"]);
    });

    it("rejects a recipient that does not match the custom type's schema", () => {
      const registry = new RecipientTypeRegistry();
      registry.register(webhookRecipient);

      const testProvider = new TestProvider(registry, ["webhookUrl"]);

      let error: any;
      try {
        testProvider.validateRecipients(["ok://fine", "not a url"]);
      } catch (e) {
        error = e;
      }

      expect(error.message).toBe("TestProvider: 1 invalid recipient(s)");
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0].message).toContain(
        'Recipient #1 "not a url" matches none of the accepted recipient types (webhookUrl)',
      );
    });

    it("throws when a provider references an unregistered recipient type", () => {
      const registry = new RecipientTypeRegistry();

      expect(() => new TestProvider(registry, ["unknownType"])).toThrowError(
        'Recipient type "unknownType" is not registered.',
      );
    });

    it("refuses to validate recipients before the registry is bound", () => {
      class UnboundProvider extends TestProvider {
        override bindRecipientTypes(): void {
          // skip the binding performed by the mock constructor
        }
      }

      const provider = new UnboundProvider();

      expect(() => provider.validateRecipients(["x"])).toThrowError(
        "not registered on the plugin yet",
      );
    });

    it("reports the matched type of each recipient for a multi-type provider", () => {
      const registry = new RecipientTypeRegistry();
      registry.register(webhookRecipient);
      registry.register({
        name: "topic",
        description: "A topic name",
        audiences: ["technical"],
        jsonSchema: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
      });

      const testProvider = new TestProvider(registry, ["webhookUrl", "topic"]);

      expect(
        testProvider.validateRecipients([
          "alerts",
          "https://example.com/hook",
          "alerts-2",
        ]),
      ).toEqual(["topic", "webhookUrl", "topic"]);
    });

    it("rejects recipients that are not a non-empty array of strings", () => {
      const testProvider = new TestProvider();

      for (const invalid of [[], [""], [{ to: "x" }], "x", undefined]) {
        expect(() => testProvider.validateRecipients(invalid)).toThrowError(
          "must be a non-empty array of non-empty strings",
        );
      }
    });

    it("registering the same recipient type twice with an identical definition is a no-op", () => {
      const registry = new RecipientTypeRegistry();
      registry.register(webhookRecipient);

      expect(() => registry.register({ ...webhookRecipient })).not.toThrow();
      expect(registry.list()).toHaveLength(1);
    });

    it("registering the same recipient type twice with a conflicting definition throws", () => {
      const registry = new RecipientTypeRegistry();
      registry.register(webhookRecipient);

      expect(() =>
        registry.register({
          ...webhookRecipient,
          jsonSchema: { type: "object" },
        }),
      ).toThrowError(
        'Recipient type "webhookUrl" is already registered with a different definition.',
      );
    });
  });
});
