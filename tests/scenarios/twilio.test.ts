import { ResponsePayload } from "kuzzle-sdk";
import { setupHooks } from "../helpers";

jest.setTimeout(10000);

describe("Twilio", () => {
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
          mockedAccounts: { twilio: ["common", "ilayda", "water-fairy"] },
        },
      }
    );

    try {
      await node1.query({
        controller: "hermes/twilio",
        action: "removeAccount",
        account: "ilayda",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/twilio",
      action: "addAccount",
      account: "ilayda",
      body: {
        accountSid: "AC-accountSid",
        authToken: "authToken",
        defaultSender: "+9053365366473",
      },
    });

    await node1.query({
      controller: "hermes/twilio",
      action: "sendSms",
      account: "ilayda",
      body: { to: "+33629951621", text: "Merhaba-1" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Merhaba-1")
    ).resolves.toMatchObject({
      _source: {
        account: "ilayda",
        from: "+9053365366473",
        to: "+33629951621",
        body: "Merhaba-1",
      },
    });

    await node1.query({
      controller: "hermes/twilio",
      action: "sendSms",
      account: "common",
      body: { from: "+905312693835", to: "+33629951621", text: "Alo" },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Alo")
    ).resolves.toMatchObject({
      _source: {
        account: "common",
        from: "+905312693835",
        to: "+33629951621",
        body: "Alo",
      },
    });
  });

  it("List accounts", async () => {
    let response: ResponsePayload;

    try {
      await node1.query({
        controller: "hermes/twilio",
        action: "removeAccount",
        account: "ilayda",
      });

      await node1.query({
        controller: "hermes/twilio",
        action: "removeAccount",
        account: "water-fairy",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/twilio",
      action: "addAccount",
      account: "ilayda",
      body: {
        accountSid: "AC-accountSid",
        authToken: "authToken",
        defaultSender: "+9053365366473",
      },
    });

    await node1.query({
      controller: "hermes/twilio",
      action: "addAccount",
      account: "water-fairy",
      body: {
        accountSid: "AC-accountSid",
        authToken: "authToken",
        defaultSender: "+9053365366472",
      },
    });

    response = await node1.query({
      controller: "hermes/twilio",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(3);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "+33629951621" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "+9053365366473" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "water-fairy",
      options: { defaultSender: "+9053365366472" },
    });

    await node1.query({
      controller: "hermes/twilio",
      action: "removeAccount",
      account: "water-fairy",
    });

    response = await node1.query({
      controller: "hermes/twilio",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "+33629951621" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "+9053365366473" },
    });

    response = await node2.query({
      controller: "hermes/twilio",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "+33629951621" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "+9053365366473" },
    });

    response = await node3.query({
      controller: "hermes/twilio",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "+33629951621" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "+9053365366473" },
    });
  });
});
