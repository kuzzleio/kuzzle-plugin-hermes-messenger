import { ResponsePayload } from "kuzzle-sdk";
import { setupHooks } from "../helpers";

jest.setTimeout(10000);

describe("SMSEnvoi", () => {
  const { node1, node2, node3 } = setupHooks();

  it("Register an account and send an email", async () => {
    await expect(node1.index.exists("hermes-messenger")).resolves.toBe(true);

    await expect(
      node1.collection.exists("hermes-messenger", "config")
    ).resolves.toBe(true);

    await node1.document.update(
      "hermes-messenger",
      "config",
      "plugin--hermes-messenger",
      {
        "hermes-messenger": {
          mockedAccounts: {
            smsenvoi: ["test", "common", "fairy-tail"],
          },
        },
      }
    );

    try {
      await node1.query({
        controller: "hermes/smsenvoi",
        action: "removeAccount",
        account: "test",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "addAccount",
      account: "test",
      body: {
        email: "test@kuzzle.io",
        password: "dummyPass",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "sendSms",
      account: "test",
      body: { text: "test message", recipients: "+33629951621" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "test message")
    ).resolves.toMatchObject({
      _source: {
        account: "test",
        recipients: "+33629951621",
        text: "test message",
      },
    });
  });

  it("List accounts", async () => {
    let response: ResponsePayload;

    try {
      await node1.query({
        controller: "hermes/smsenvoi",
        action: "removeAccount",
        account: "test",
      });

      await node1.query({
        controller: "hermes/smsenvoi",
        action: "removeAccount",
        account: "fairy-tail",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "addAccount",
      account: "test",
      body: {
        email: "test@kuzzle.io",
        password: "dummyPass",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "addAccount",
      account: "fairy-tail",
      body: {
        email: "fairytail@kuzzle.io",
        password: "dummyPass",
      },
    });

    response = await node1.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        { name: "test", options: { email: "test@kuzzle.io" } },
        { name: "common", options: { email: "amaret@kuzzle.io" } },
        { name: "fairy-tail", options: { email: "fairytail@kuzzle.io" } },
      ],
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "removeAccount",
      account: "fairy-tail",
    });

    response = await node1.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        { name: "test", options: { email: "test@kuzzle.io" } },
        { name: "common", options: { email: "amaret@kuzzle.io" } },
      ],
    });

    response = await node2.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        { name: "test", options: { email: "test@kuzzle.io" } },
        { name: "common", options: { email: "amaret@kuzzle.io" } },
      ],
    });

    response = await node3.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        { name: "test", options: { email: "test@kuzzle.io" } },
        { name: "common", options: { email: "amaret@kuzzle.io" } },
      ],
    });
  });
});
