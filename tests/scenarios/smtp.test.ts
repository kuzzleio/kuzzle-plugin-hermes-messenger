import { ResponsePayload } from "kuzzle-sdk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { setupHooks } from "../helpers";

jest.setTimeout(10000);

describe("SMTP", () => {
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
          mockedAccounts: { smtp: ["common", "ilayda", "water-fairy"] },
        },
      }
    );

    try {
      await node1.query({
        controller: "hermes/smtp",
        action: "removeAccount",
        account: "ilayda",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/smtp",
      action: "addAccount",
      account: "ilayda",
      body: {
        host: "smtp.example.com",
        port: 587,
        user: "dummyUser",
        pass: "dummyPass",
        defaultSender: "ilayda@gmail.com",
      },
    });

    await node1.query({
      controller: "hermes/smtp",
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
      controller: "hermes/smtp",
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
          mockedAccounts: { smtp: ["common", "ilayda", "water-fairy"] },
        },
      }
    );

    await node1.query({
      controller: "hermes/smtp",
      action: "removeAccount",
      account: "ilayda",
    });

    await node1.query({
      controller: "hermes/smtp",
      action: "addAccount",
      account: "ilayda",
      body: {
        host: "smtp.example.com",
        port: 587,
        user: "dummyUser",
        pass: "dummyPass",
        defaultSender: "ilayda@gmail.com",
      },
    });

    const pdfBase64 = await fs.readFile(
      path.join(__dirname, "..", "fixtures", "dummy.pdf"),
      "base64"
    );

    await node1.query({
      controller: "hermes/smtp",
      action: "sendEmail",
      account: "ilayda",
      body: {
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        subject: "Pouet-email",
        html: "<div> body </div>",
        attachments: [
          {
            content: pdfBase64,
            contentType: "application/pdf",
            filename: "test.pdf",
            contentDisposition: "attachment",
          },
        ],
      },
    });

    await expect(
      node1.document.get("hermes-messenger", "messages", "Pouet-email")
    ).resolves.toMatchObject({
      _source: {
        account: "ilayda",
        from: "support@kuzzle.io",
        to: ["jobs@kuzzle.io"],
        subject: "Pouet-email",
        html: "<div> body </div>",
        attachments: [
          {
            content: pdfBase64,
            contentType: "application/pdf",
            filename: "test.pdf",
            contentDisposition: "attachment",
          },
        ],
      },
    });
  });

  it("List accounts", async () => {
    let response: ResponsePayload;

    try {
      await node1.query({
        controller: "hermes/smtp",
        action: "removeAccount",
        account: "ilayda",
      });

      await node1.query({
        controller: "hermes/smtp",
        action: "removeAccount",
        account: "water-fairy",
      });
    } catch {} // eslint-disable-line no-empty

    await node1.query({
      controller: "hermes/smtp",
      action: "addAccount",
      account: "ilayda",
      body: {
        host: "smtp.example.com",
        port: 587,
        user: "dummyUser",
        pass: "dummyPass",
        defaultSender: "ilayda@gmail.com",
      },
    });

    await node1.query({
      controller: "hermes/smtp",
      action: "addAccount",
      account: "water-fairy",
      body: {
        host: "smtp.example.com",
        port: 587,
        user: "dummyUser",
        pass: "dummyPass",
        defaultSender: "water-fairy@gmail.com",
      },
    });

    response = await node1.query({
      controller: "hermes/smtp",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(5);
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
    expect(response.result.accounts).toContainEqual({
      name: "starttls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "tls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });

    await node1.query({
      controller: "hermes/smtp",
      action: "removeAccount",
      account: "water-fairy",
    });

    response = await node1.query({
      controller: "hermes/smtp",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(4);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "starttls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "tls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });

    response = await node1.query({
      controller: "hermes/smtp",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(4);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "starttls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "tls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });

    response = await node2.query({
      controller: "hermes/smtp",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(4);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "starttls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "tls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });

    response = await node3.query({
      controller: "hermes/smtp",
      action: "listAccounts",
    });

    expect(response.result.accounts).toHaveLength(4);
    expect(response.result.accounts).toContainEqual({
      name: "common",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "ilayda",
      options: { defaultSender: "ilayda@gmail.com" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "starttls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
    expect(response.result.accounts).toContainEqual({
      name: "tls",
      options: { defaultSender: "amaret@kuzzle.io" },
    });
  });
});
