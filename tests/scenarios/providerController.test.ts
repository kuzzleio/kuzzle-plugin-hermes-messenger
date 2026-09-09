import { defineReflectProperties } from "tests/helpers";
import { context, TestProvider } from "tests/mocks";
import { ProviderController } from "lib/controllers";
import { ProviderManager } from "lib/providers";
import { RecipientTypeRegistry, uriRecipient } from "lib/recipients";
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

/** Minimal stand-in for a KuzzleRequest carrying only arguments. */
function fakeRequest(args: Record<string, unknown>) {
  return {
    input: { args, body: {} },
    getString(name: string) {
      const value = args[name];
      if (typeof value !== "string") {
        throw new Error(`Wrong type for argument "${name}"`);
      }
      return value;
    },
    getBodyObject(_name: string, def: unknown) {
      return def;
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

  it("rejects an audience that is neither a string nor an array of strings", async () => {
    const controller = buildController();

    for (const audience of [42, { human: true }, ["human", 1]]) {
      await expect(
        controller.listRecipientTypes(fakeRequest({ audience })),
      ).rejects.toThrowError('Wrong type for argument "audience"');
    }
  });
});
