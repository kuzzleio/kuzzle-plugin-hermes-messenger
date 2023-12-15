import { ResponsePayload } from "kuzzle-sdk";
import { setupHooks } from "../helpers";

jest.setTimeout(10000);

describe("Sendgrid", () => {
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
          mockedAccounts: { sendgrid: ["common", "ilayda", "water-fairy"] },
        },
      }
    );

    try {
      await node1.query({
        controller: "hermes/sendgrid",
        action: "removeAccount",
        account: "ilayda",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/sendgrid",
      action: "addAccount",
      account: "ilayda",
      body: { apiKey: "apiKey", defaultSender: "ilayda@gmail.com" },
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "sendEmail",
      account: "ilayda",
      body: {
        to: ["jobs@kuzzle.io"],
        subject: "Merhaba-email",
        html: "<div> body </div>",
      },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Merhaba-email")
    ).resolves.toMatchObject({
      _source: {
        account: "ilayda",
        from: "ilayda@gmail.com",
        to: ["jobs@kuzzle.io"],
        subject: "Merhaba-email",
        html: "<div> body </div>",
      },
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "sendEmail",
      account: "common",
      body: {
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        subject: "Alo-email",
        html: "<div> body </div>",
      },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Alo-email")
    ).resolves.toMatchObject({
      _source: {
        account: "common",
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        subject: "Alo-email",
        html: "<div> body </div>",
      },
    });
  });

  it("Send a templated email", async () => {
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
          mockedAccounts: { sendgrid: ["common", "ilayda", "water-fairy"] },
        },
      }
    );

    await node1.query({
      controller: "hermes/sendgrid",
      action: "removeAccount",
      account: "ilayda",
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "addAccount",
      account: "ilayda",
      body: { apiKey: "apiKey", defaultSender: "ilayda@gmail.com" },
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "sendTemplatedEmail",
      account: "ilayda",
      body: {
        templateId: "sales-42",
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        templateData: { foo: "bar" },
      },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "sales-42")
    ).resolves.toMatchObject({
      _source: {
        account: "ilayda",
        templateId: "sales-42",
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        dynamic_template_data: { foo: "bar" },
      },
    });
  });

  it("List accounts", async () => {
    let response: ResponsePayload;

    try {
      await node1.query({
        controller: "hermes/sendgrid",
        action: "removeAccount",
        account: "ilayda",
      });

      await node1.query({
        controller: "hermes/sendgrid",
        action: "removeAccount",
        account: "water-fairy",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/sendgrid",
      action: "addAccount",
      account: "ilayda",
      body: { apiKey: "apiKey", defaultSender: "ilayda@gmail.com" },
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "addAccount",
      account: "water-fairy",
      body: { apiKey: "apiKey", defaultSender: "water-fairy@gmail.com" },
    });

    response = await node1.query({
      controller: "hermes/sendgrid",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(3);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "water-fairy",
      options: { defaultSender: "water-fairy@gmail.com" },
    });

    await node1.query({
      controller: "hermes/sendgrid",
      action: "removeAccount",
      account: "water-fairy",
    });

    response = await node1.query({
      controller: "hermes/sendgrid",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });

    response = await node1.query({
      controller: "hermes/sendgrid",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });

    response = await node2.query({
      controller: "hermes/sendgrid",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });

    response = await node3.query({
      controller: "hermes/sendgrid",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(2);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
  });
});
