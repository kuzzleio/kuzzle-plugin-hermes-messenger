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
        userKey: "testUserKey",
        accessToken: "testAccessToken",
        defaultSender: "+330645986521",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "sendSms",
      account: "test",
      body: { to: "+33629951621", text: "test message" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "test message"),
    ).resolves.toMatchObject({
      _source: {
        account: "test",
        from: "+330645986521",
        to: "+33629951621",
        body: "test message",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "sendSms",
      account: "common",
      body: { from: "+33701020304", to: "+33701020304", text: "Myself" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Myself"),
    ).resolves.toMatchObject({
      _source: {
        account: "common",
        from: "+33701020304",
        to: "+33701020304",
        body: "Myself",
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
        userKey: "testUserKey",
        accessToken: "testAccessToken",
        defaultSender: "+330645986521",
      },
    });

    await node1.query({
      controller: "hermes/smsenvoi",
      action: "addAccount",
      account: "fairy-tail",
      body: {
        userKey: "fairytailUserKey",
        accessToken: "fairyTailAccessToken",
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
          options: {
            userKey: "commonUserKey",
            accessToken: "commonAccessToken",
            defaultSender: "+33701020304",
          },
        },
        {
          name: "test",
          options: {
            userKey: "testUserKey",
            accessToken: "testAccessToken",
            defaultSender: "+330645986521",
          },
        },
        {
          name: "fairy-tail",
          options: {
            userKey: "fairytailUserKey",
            accessToken: "fairyTailAccessToken",
            defaultSender: "+33687654321",
          },
        },
      ],
    });

    response = await node1.query({
      controller: "hermes/smsenvoi",
      action: "listAccounts",
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
          options: {
            userKey: "commonUserKey",
            accessToken: "commonAccessToken",
            defaultSender: "+33701020304",
          },
        },
        {
          name: "test",
          options: {
            userKey: "testUserKey",
            accessToken: "testAccessToken",
            defaultSender: "+330645986521",
          },
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
          options: {
            userKey: "commonUserKey",
            accessToken: "commonAccessToken",
            defaultSender: "+33701020304",
          },
        },
        {
          name: "test",
          options: {
            userKey: "testUserKey",
            accessToken: "testAccessToken",
            defaultSender: "+330645986521",
          },
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
          options: {
            userKey: "commonUserKey",
            accessToken: "commonAccessToken",
            defaultSender: "+33701020304",
          },
        },
        {
          name: "test",
          options: {
            userKey: "testUserKey",
            accessToken: "testAccessToken",
            defaultSender: "+330645986521",
          },
        },
      ],
    });
  });
});
