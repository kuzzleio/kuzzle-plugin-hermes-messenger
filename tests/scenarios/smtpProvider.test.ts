import { defineReflectProperties } from "tests/helpers";
import { HermesMessengerPlugin } from "lib/HermesMessengerPlugin";
import { SmtpError, SmtpProvider } from "lib/providers";
import { context } from "tests/mocks";
import { ExternalServiceError } from "kuzzle";
import { createTransport } from "nodemailer";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("nodemailer", () => ({ createTransport: vi.fn() }));

const transport = { sendMail: vi.fn(), verify: vi.fn() };

const params = {
  default_sender: "no-reply@example.com",
  host_name: "smtp.example.com",
  password: "secret",
  port: 587,
  user: "user",
};

async function smtpProvider() {
  const provider = new HermesMessengerPlugin().getProvider(
    "smtp",
  ) as SmtpProvider;
  await provider.init({}, context);

  return provider;
}

beforeAll(() => {
  defineReflectProperties();
});

beforeEach(() => {
  vi.mocked(createTransport)
    .mockReset()
    .mockReturnValue(transport as any);
  transport.sendMail.mockReset().mockResolvedValue({});
  transport.verify.mockReset().mockResolvedValue(true);
});

describe("SmtpProvider – timeouts", () => {
  it("leaves nodemailer's timeouts alone by default", async () => {
    (await smtpProvider()).addAccount("common", params);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: undefined,
        greetingTimeout: undefined,
        socketTimeout: undefined,
      }),
    );
  });

  it("passes the account's timeouts to nodemailer", async () => {
    (await smtpProvider()).addAccount("common", {
      ...params,
      connection_timeout: 10000,
      greeting_timeout: 5000,
      socket_timeout: 20000,
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 20000,
      }),
    );
  });

  it("refuses a timeout that is not a positive integer", async () => {
    const provider = await smtpProvider();

    expect(() =>
      provider.addAccount("common", { ...params, socket_timeout: 0 }),
    ).toThrow();
    expect(() =>
      provider.addAccount("common", { ...params, socket_timeout: "10s" }),
    ).toThrow();
  });
});

describe("SmtpProvider – errors", () => {
  it("keeps the SMTP reply of a rejected recipient", async () => {
    const provider = await smtpProvider();
    provider.addAccount("common", params);
    transport.sendMail.mockRejectedValue(
      Object.assign(
        new Error(
          "Can't send mail - all recipients were rejected: 550 5.1.1 User unknown",
        ),
        {
          code: "EENVELOPE",
          response: "550 5.1.1 User unknown",
          responseCode: 550,
        },
      ),
    );

    const error = await provider
      .sendMessage("common", ["nobody@example.com"], {
        message: "hello",
        subject: "hi",
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(SmtpError);
    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error).toMatchObject({
      message:
        "Can't send mail - all recipients were rejected: 550 5.1.1 User unknown",
      response: "550 5.1.1 User unknown",
      responseCode: 550,
      smtpCode: "EENVELOPE",
    });
  });

  it("keeps the code of a connection failure, raised by verify()", async () => {
    const provider = await smtpProvider();
    provider.addAccount("common", params);
    transport.verify.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:587"), {
        code: "ESOCKET",
      }),
    );

    const error = await provider
      .sendMessage("common", ["someone@example.com"], {
        message: "hello",
        subject: "hi",
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(SmtpError);
    expect(error.smtpCode).toBe("ESOCKET");
    expect(error.responseCode).toBeUndefined();
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("sends once the server is verified", async () => {
    const provider = await smtpProvider();
    provider.addAccount("common", params);

    await provider.sendMessage("common", ["someone@example.com"], {
      message: "<p>hello</p>",
      subject: "hi",
    });

    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        html: "<p>hello</p>",
        to: ["someone@example.com"],
      }),
    );
  });
});
