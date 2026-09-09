import { defineReflectProperties } from "tests/helpers";
import { context, TestProvider } from "tests/mocks";
import { ProviderController } from "lib/controllers";
import { ProviderManager } from "lib/providers";
import { RecipientTypeRegistry, uriRecipient } from "lib/recipients";
import { BadRequestError } from "kuzzle";
import { describe, it, expect, beforeAll, vi } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

/** Minimal stand-in for a KuzzleRequest carrying arguments and a body. */
function fakeRequest(
  args: Record<string, unknown>,
  body: Record<string, unknown> = {},
) {
  return {
    input: { args, body },
    getString(name: string) {
      const value = args[name];
      if (typeof value !== "string") {
        throw new BadRequestError(`Wrong type for argument "${name}"`);
      }
      return value;
    },
    getBodyObject(name: string, def?: unknown) {
      const value = body[name] ?? def;
      if (typeof value !== "object" || value === null) {
        throw new BadRequestError(`Wrong type for body argument "${name}"`);
      }
      return value;
    },
    getBodyArray(name: string) {
      const value = body[name];
      if (!Array.isArray(value)) {
        throw new BadRequestError(`Wrong type for body argument "${name}"`);
      }
      return value;
    },
  } as any;
}

function buildController(): ProviderController {
  const registry = new RecipientTypeRegistry();
  registry.register(uriRecipient);
  const manager = new ProviderManager();
  manager.set("human", new TestProvider(registry));
  manager.set("technical", new TestProvider(registry, ["uri"]));

  return new ProviderController({}, context, manager, registry);
}

describe("ProviderController – audience argument", () => {
  it("accepts a single audience", async () => {
    const controller = buildController();

    const types = await controller.listRecipientTypes(
      fakeRequest({ audience: "technical" }),
    );
    expect(types.map((t) => t.name)).toEqual(["uri"]);

    const providers = await controller.listProviders(
      fakeRequest({ audience: "human" }),
    );
    expect(providers.map((p) => p.acceptedRecipientTypes)).toEqual([
      ["testRecipient"],
    ]);
  });

  it("accepts an array of audiences", async () => {
    const controller = buildController();

    const types = await controller.listRecipientTypes(
      fakeRequest({ audience: ["human", "technical"] }),
    );
    expect(types.map((t) => t.name)).toEqual(["uri", "testRecipient"]);

    const { accounts } = await controller.listAccounts(
      fakeRequest({ audience: ["nobody", "technical"] }),
    );
    expect(accounts).toEqual([]);
    expect(
      (await controller.listProviders(fakeRequest({ audience: ["nobody"] })))
        .length,
    ).toBe(0);
  });

  it("accepts a comma separated list, as sent in HTTP query strings", async () => {
    const controller = buildController();

    const types = await controller.listRecipientTypes(
      fakeRequest({ audience: "human, technical" }),
    );
    expect(types.map((t) => t.name)).toEqual(["uri", "testRecipient"]);

    const providers = await controller.listProviders(
      fakeRequest({ audience: "technical," }),
    );
    expect(providers.map((p) => p.acceptedRecipientTypes)).toEqual([["uri"]]);
  });

  it("returns everything without the argument", async () => {
    const controller = buildController();

    expect(await controller.listRecipientTypes(fakeRequest({}))).toHaveLength(
      2,
    );
    expect(await controller.listProviders(fakeRequest({}))).toHaveLength(2);
  });

  it("filters providers on the capability argument, comma separated or array", async () => {
    const controller = buildController();

    expect(
      await controller.listProviders(fakeRequest({ capability: "text" })),
    ).toHaveLength(2);
    expect(
      await controller.listProviders(fakeRequest({ capability: "text,file" })),
    ).toHaveLength(0);
    expect(
      await controller.listProviders(
        fakeRequest({ capability: ["text"], audience: "technical" }),
      ),
    ).toHaveLength(1);
  });

  it("filters accounts on the capability argument", async () => {
    const controller = buildController();
    const manager = (controller as any).providerManager as ProviderManager;
    manager.get("human").nodeAddAccount("a", {});
    manager.get("technical").nodeAddAccount("b", {});

    expect(
      (await controller.listAccounts(fakeRequest({ capability: "text" })))
        .accounts,
    ).toHaveLength(2);
    expect(
      (await controller.listAccounts(fakeRequest({ capability: "text,file" })))
        .accounts,
    ).toHaveLength(0);
  });

  it("rejects an audience that is neither a string nor an array of strings", async () => {
    const controller = buildController();

    for (const audience of [42, { human: true }, ["human", 1]]) {
      await expect(
        controller.listRecipientTypes(fakeRequest({ audience })),
      ).rejects.toThrowError('Wrong type for argument "audience"');
    }
  });
});

describe("ProviderController – accounts", () => {
  const strictSchema = {
    type: "object" as const,
    properties: { sender: { type: "string" as const } },
    required: ["sender"],
  };

  function build() {
    const registry = new RecipientTypeRegistry();
    const manager = new ProviderManager();
    const provider = new TestProvider(registry, undefined, strictSchema);
    manager.set("test", provider);

    return {
      provider,
      controller: new ProviderController({}, context, manager, registry),
    };
  }

  it("addAccount registers the account named by `name` with `body.params`", async () => {
    const { controller, provider } = build();

    await controller.addAccount(
      fakeRequest(
        { provider: "test", name: "common" },
        { params: { sender: "a@b.co" } },
      ),
    );

    expect(provider.listAccounts()).toEqual(["common"]);
    expect(provider.getAccount("common").params).toEqual({ sender: "a@b.co" });
  });

  it("addAccount requires the `name` argument and `body.params`", async () => {
    const { controller, provider } = build();

    await expect(
      controller.addAccount(
        fakeRequest({ provider: "test" }, { params: { sender: "a@b.co" } }),
      ),
    ).rejects.toThrowError('Wrong type for argument "name"');
    await expect(
      controller.addAccount(fakeRequest({ provider: "test", name: "x" })),
    ).rejects.toThrowError('Wrong type for body argument "params"');

    expect(provider.listAccounts()).toEqual([]);
  });

  it("addAccount propagates the params validation error", async () => {
    const { controller, provider } = build();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      controller.addAccount(
        fakeRequest({ provider: "test", name: "bad" }, { params: {} }),
      ),
    ).rejects.toThrowError("account parameters do not match");
    expect(provider.listAccounts()).toEqual([]);

    vi.restoreAllMocks();
  });

  it("addAccount fails on an unknown provider", async () => {
    const { controller } = build();

    await expect(
      controller.addAccount(
        fakeRequest({ provider: "nope", name: "x" }, { params: {} }),
      ),
    ).rejects.toThrowError("nope provider is not available");
  });

  it("removeAccount removes the account named by `name`", async () => {
    const { controller, provider } = build();
    provider.addAccount("common", { sender: "a@b.co" });

    await controller.removeAccount(
      fakeRequest({ provider: "test", name: "common" }),
    );

    expect(provider.listAccounts()).toEqual([]);
  });

  it("sendMessage validates the body then sends through the account named by `name`", async () => {
    const { controller, provider } = build();
    provider.addAccount("common", { sender: "a@b.co" });
    const sendSpy = vi.spyOn(provider, "sendMessage");

    await controller.sendMessage(
      fakeRequest(
        { provider: "test", name: "common" },
        { recipients: ["anyone"], content: { text: "hi" } },
      ),
    );

    expect(sendSpy).toHaveBeenCalledWith(
      "common",
      ["anyone"],
      { text: "hi" },
      {},
    );

    await expect(
      controller.sendMessage(
        fakeRequest(
          { provider: "test", name: "common" },
          { recipients: [], content: { text: "hi" } },
        ),
      ),
    ).rejects.toThrowError("non-empty array");
    expect(sendSpy).toHaveBeenCalledOnce();
  });
});
