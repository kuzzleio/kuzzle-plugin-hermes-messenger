import { defineReflectProperties } from "tests/helpers";
import { TestProvider } from "tests/mocks";
import { ProviderManager } from "lib/providers";
import { RecipientTypeRegistry, uriRecipient } from "lib/recipients";
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

/**
 * Two providers: `first` accepts the mock's human oriented `testRecipient`,
 * `second` only accepts the technical `uri` type.
 */
function buildManager(): ProviderManager {
  const registry = new RecipientTypeRegistry();
  registry.register(uriRecipient);
  const manager = new ProviderManager();
  const first = new TestProvider(registry);
  const second = new TestProvider(registry, ["uri"]);

  manager.set("first", first);
  manager.set("second", second);

  first.nodeAddAccount("alpha", { sender: "alpha@example.com" });
  first.nodeAddAccount("beta", { sender: "beta@example.com" });
  second.nodeAddAccount("alpha", { token: "public" });

  return manager;
}

/** Fields every account of `first` / `second` carries, besides its name. */
const humanAccount = {
  provider: "first",
  acceptedRecipientTypes: ["testRecipient"],
  capabilities: ["text"],
  audiences: ["human"],
};
const technicalAccount = {
  provider: "second",
  acceptedRecipientTypes: ["uri"],
  capabilities: ["text"],
  audiences: ["technical"],
};

describe("ProviderManager – listAccounts", () => {
  it("returns an empty list when no account is registered", () => {
    const manager = new ProviderManager();
    manager.set("first", new TestProvider());

    expect(manager.listAccounts()).toEqual([]);
  });

  it("lists the accounts of every provider with their provider route key", () => {
    expect(buildManager().listAccounts()).toEqual([
      { name: "alpha", ...humanAccount },
      { name: "beta", ...humanAccount },
      { name: "alpha", ...technicalAccount },
    ]);
  });

  it("only lists the accounts of the given provider", () => {
    expect(buildManager().listAccounts({ provider: "second" })).toEqual([
      { name: "alpha", ...technicalAccount },
    ]);
  });

  it("throws when filtering on an unknown provider", () => {
    expect(() =>
      buildManager().listAccounts({ provider: "unknown" }),
    ).toThrowError("unknown provider is not available");
  });

  it("only lists the accounts of providers targeting the given audience", () => {
    const manager = buildManager();

    expect(manager.listAccounts({ audience: "human" })).toEqual([
      { name: "alpha", ...humanAccount },
      { name: "beta", ...humanAccount },
    ]);
    expect(manager.listAccounts({ audience: "technical" })).toEqual([
      { name: "alpha", ...technicalAccount },
    ]);
    expect(manager.listAccounts({ audience: "nobody" })).toEqual([]);
  });

  it("accepts several audiences", () => {
    const manager = buildManager();

    expect(
      manager.listAccounts({ audience: ["human", "technical"] }),
    ).toHaveLength(3);
    expect(
      manager.listAccounts({ audience: ["technical", "nobody"] }),
    ).toHaveLength(1);
    expect(manager.listAccounts({ audience: [] })).toHaveLength(3);
  });

  it("hydrates each account with the recipient type names and audiences of its provider", () => {
    const registry = new RecipientTypeRegistry();
    registry.register(uriRecipient);
    const manager = new ProviderManager();
    const multi = new TestProvider(registry, ["testRecipient", "uri"]);
    manager.set("multi", multi);
    multi.nodeAddAccount("both", {});

    expect(manager.listAccounts()).toEqual([
      {
        name: "both",
        provider: "multi",
        acceptedRecipientTypes: ["testRecipient", "uri"],
        capabilities: ["text"],
        audiences: ["human", "technical"],
      },
    ]);
  });

  it("filters accounts on the capabilities of their provider", () => {
    const manager = buildManager();
    const rich = new TestProvider(new RecipientTypeRegistry());
    rich.capabilities = ["text", "html", "file"];
    manager.set("rich", rich);
    rich.nodeAddAccount("mail", {});

    expect(manager.listAccounts({ capability: "text" })).toHaveLength(4);
    expect(manager.listAccounts({ capability: ["html", "file"] })).toEqual([
      {
        name: "mail",
        provider: "rich",
        acceptedRecipientTypes: ["testRecipient"],
        capabilities: ["text", "html", "file"],
        audiences: ["human"],
      },
    ]);
    expect(manager.listAccounts({ capability: "json" })).toEqual([]);
    expect(
      manager.listAccounts({ capability: "file", audience: "technical" }),
    ).toEqual([]);
  });

  it("combines the provider and audience filters", () => {
    const manager = buildManager();

    expect(
      manager.listAccounts({ provider: "first", audience: "human" }),
    ).toHaveLength(2);
    expect(
      manager.listAccounts({ provider: "first", audience: "technical" }),
    ).toEqual([]);
  });
});

describe("ProviderManager – listProviders", () => {
  it("lists every provider without filter", () => {
    expect(buildManager().listProviders()).toHaveLength(2);
  });

  it("filters providers on the audience of their accepted recipient types", () => {
    const manager = buildManager();

    const human = manager.listProviders({ audience: "human" });
    expect(human).toHaveLength(1);
    expect(human[0].getAcceptedRecipientTypes()).toEqual(["testRecipient"]);

    const technical = manager.listProviders({ audience: "technical" });
    expect(technical).toHaveLength(1);
    expect(technical[0].getAcceptedRecipientTypes()).toEqual(["uri"]);

    expect(manager.listProviders({ audience: "nobody" })).toEqual([]);
  });

  it("accepts several audiences", () => {
    const manager = buildManager();

    expect(
      manager.listProviders({ audience: ["human", "technical"] }),
    ).toHaveLength(2);
    expect(
      manager.listProviders({ audience: ["nobody", "human"] }),
    ).toHaveLength(1);
    expect(manager.listProviders({ audience: [] })).toHaveLength(2);
  });

  it("filters providers on their capabilities, all requested ones being required", () => {
    const manager = buildManager();
    const rich = new TestProvider(new RecipientTypeRegistry());
    rich.capabilities = ["text", "html", "file"];
    manager.set("rich", rich);

    expect(manager.listProviders({ capability: "text" })).toHaveLength(3);
    expect(manager.listProviders({ capability: "file" })).toEqual([rich]);
    expect(manager.listProviders({ capability: ["html", "file"] })).toEqual([
      rich,
    ]);
    expect(manager.listProviders({ capability: ["text", "json"] })).toEqual([]);
    expect(manager.listProviders({ capability: [] })).toHaveLength(3);
  });

  it("combines the capability and audience filters", () => {
    const manager = buildManager();

    expect(
      manager.listProviders({ capability: "text", audience: "human" }),
    ).toHaveLength(1);
    expect(
      manager.listProviders({ capability: "file", audience: "human" }),
    ).toEqual([]);
  });

  it("serializes the union of the audiences a provider can address", () => {
    const registry = new RecipientTypeRegistry();
    registry.register(uriRecipient);
    registry.register({
      name: "pushToken",
      description: "A device push token",
      audiences: ["human", "technical"],
      jsonSchema: { type: "string" },
    });

    expect(new TestProvider(registry).serialize().audiences).toEqual(["human"]);
    expect(new TestProvider(registry, ["uri"]).serialize().audiences).toEqual([
      "technical",
    ]);
    expect(
      new TestProvider(registry, ["testRecipient", "uri"]).serialize()
        .audiences,
    ).toEqual(["human", "technical"]);
    expect(
      new TestProvider(registry, [
        "uri",
        "pushToken",
        "testRecipient",
      ]).serialize().audiences,
    ).toEqual(["technical", "human"]);
  });

  it("matches a provider accepting several recipient types when one belongs to the audience", () => {
    const registry = new RecipientTypeRegistry();
    registry.register(uriRecipient);
    const manager = new ProviderManager();
    manager.set("multi", new TestProvider(registry, ["testRecipient", "uri"]));

    expect(manager.listProviders({ audience: "human" })).toHaveLength(1);
    expect(manager.listProviders({ audience: "technical" })).toHaveLength(1);
  });
});
