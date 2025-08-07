import { ResponsePayload } from "kuzzle-sdk";
import { setupHooks } from "../helpers";

describe("SMSEnvoi", () => {
  const { node1, node2, node3 } = setupHooks();

  it("Register an account and send an sms", async () => {
    await expect(node1.index.exists("hermes-messenger")).resolves.toBe(true);

    await expect(
      node1.collection.exists("hermes-messenger", "config"),
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
      },
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
        userKey: "myuserKey",
        accessToken: "myaccessToken",
        defaultSender: "+330645986521",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "sendSms",
      account: "test",
      body: { text: "test message", recipients: "+33629951621" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "test message"),
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
        userKey: "myuserKey",
        accessToken: "theaccessToken",
        defaultSender: "+33612345678",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "addAccount",
      account: "fairy-tail",
      body: {
        userKey: "mykeyfairytail",
        accessToken: "dummyaccessToken",
        defaultSender: "+33687654321",
      },
    });

    response = await node1.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        {
          name: "common",
          options: { userKey: "yes", accessToken: "dontknow" },
        },
        {
          name: "test",
          options: { userKey: "myuserKey", accessToken: "theaccessToken" },
        },
        {
          name: "fairy-tail",
          options: {
            userKey: "mykeyfairytail",
            accessToken: "dummyaccessToken",
          },
        },
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
        {
          name: "common",
          options: { userKey: "yes", accessToken: "dontknow" },
        },
        {
          name: "test",
          options: { userKey: "myuserKey", accessToken: "theaccessToken" },
        },
      ],
    });

    response = await node2.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        {
          name: "common",
          options: { userKey: "yes", accessToken: "dontknow" },
        },
        {
          name: "test",
          options: { userKey: "myuserKey", accessToken: "theaccessToken" },
        },
      ],
    });

    response = await node3.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
    });

    expect(response.result).toMatchObject({
      accounts: [
        {
          name: "common",
          options: { userKey: "yes", accessToken: "dontknow" },
        },
        {
          name: "test",
          options: { userKey: "myuserKey", accessToken: "theaccessToken" },
        },
      ],
    });
  });
});
