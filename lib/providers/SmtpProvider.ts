import { ExternalServiceError } from "kuzzle";
import { JSONSchema7 } from "json-schema";
import { Transporter, createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import {
  Attachment,
  PROVIDER_CAPABILITY_FILE,
  PROVIDER_CAPABILITY_HTML,
  PROVIDER_CAPABILITY_TEXT,
  ProviderCapabilities,
} from "../types";
import { BaseAccount, BaseProvider } from "./BaseProvider";

/**
 * Body part of an email: `message` goes to `text` when `content.format` is
 * `"text"`, to `html` otherwise (the default).
 */
export function emailBody(content: {
  message: string;
  format?: "html" | "text";
}): { text: string } | { html: string } {
  return content.format === "text"
    ? { text: content.message }
    : { html: content.message };
}

export interface SMTPAccountParams {
  host_name: string;
  port: number;
  user: string;
  password: string;
  default_sender: string;
  [key: string]: unknown;
}

export type SMTPAccount = BaseAccount<
  Transporter<SMTPTransport.SentMessageInfo>,
  SMTPAccountParams
>;

export class SmtpProvider extends BaseProvider<SMTPAccount> {
  override capabilities: ProviderCapabilities = [
    PROVIDER_CAPABILITY_TEXT,
    PROVIDER_CAPABILITY_HTML,
    PROVIDER_CAPABILITY_FILE,
  ];

  constructor() {
    const accountParamsSchema: JSONSchema7 = {
      type: "object",
      properties: {
        host_name: {
          type: "string",
          title: "Host Name",
          minLength: 1,
        },
        port: {
          type: "integer",
          title: "Port",
        },
        user: {
          type: "string",
          title: "User",
          minLength: 1,
        },
        password: {
          type: "string",
          format: "password",
          title: "Password",
          minLength: 1,
        },
        default_sender: {
          type: "string",
          format: "email",
          title: "Default Sender",
          pattern: String.raw`^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$`,
          minLength: 1,
        },
      },
      required: ["host_name", "port", "user", "password", "default_sender"],
    };

    const messageContentSchema: JSONSchema7 = {
      type: "object",
      properties: {
        subject: {
          type: "string",
          title: "Subject",
        },
        message: {
          type: "string",
          title: "Message",
          $comment: "long-text",
        },
        format: {
          type: "string",
          title: "Format",
          description:
            "How `message` is sent: as HTML (default) or as plain text.",
          enum: ["html", "text"],
          default: "html",
        },
      },
      required: ["subject", "message"],
    };

    const messageAdditionalParamsSchema: JSONSchema7 = {
      type: "object",
      additionalProperties: false,
      properties: {
        from: { type: "string" },
        cc: {
          type: "array",
          title: "Cc",
          items: { type: "string", format: "email" },
        },
        bcc: {
          type: "array",
          title: "Bcc",
          items: { type: "string", format: "email" },
        },
        attachments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              contentType: { type: "string" },
              filename: { type: "string" },
              contentDisposition: {
                type: "string",
                enum: ["attachment", "inline"],
              },
              cid: { type: "string" },
            },
            required: [
              "content",
              "contentType",
              "filename",
              "contentDisposition",
            ],
          },
        },
      },
    };

    super(
      "SMTP",
      ["email"],
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );
  }

  /**
   * Sends an email using one of the registered SMTP accounts.
   *
   * @param accountName - Name of the registered account to use
   * @param recipients - Recipient email addresses
   * @param content - Email content: `subject`, `message` and optional `format`
   *   (`html`, the default, or `text`)
   * @param params.from - Sender override; falls back to the account's `default_sender`
   * @param params.cc - Optional carbon-copy email addresses
   * @param params.bcc - Optional blind carbon-copy email addresses
   * @param params.attachments - Optional file attachments
   */
  async sendMessage(
    accountName: string,
    recipients: string[],
    content: any,
    {
      attachments,
      from,
      cc,
      bcc,
    }: {
      attachments?: Attachment[];
      from?: string;
      cc?: string[];
      bcc?: string[];
    } = {},
  ) {
    const account = this.getAccount(accountName);
    const fromEmail = from || account.params.default_sender;

    const email: Mail.Options = {
      attachments: attachments?.map((attachment) => ({
        ...attachment,
        encoding: "base64",
      })),
      from: fromEmail,
      subject: content.subject,
      ...emailBody(content),
      to: recipients,
      cc,
      bcc,
    };

    try {
      await this.deliver(account, email);
    } catch (error) {
      this.context.log.warn(
        `An error occured while trying to send a message: ${JSON.stringify(error, null, 2)}`,
      );
      if (error.response?.body) {
        throw new ExternalServiceError(
          "SMTP " + JSON.stringify(error.response.body),
        );
      }
      throw new ExternalServiceError(error);
    }
  }

  /**
   * Creates a nodemailer transporter for the given SMTP credentials.
   * The parameters are kept on the account (`default_sender` is read at send time).
   */
  protected _createAccount(
    accountId: string,
    params: SMTPAccountParams,
  ): SMTPAccount {
    const { host_name, port, user, password } = params;

    const transporter = createTransport({
      auth: {
        pass: password,
        user,
      },
      host: host_name,
      port,
      secure: port === 465,
    });

    return { accountId, provider: transporter, params };
  }

  private async deliver(account: SMTPAccount, email: Mail.Options) {
    try {
      await account.provider.verify();
      return account.provider.sendMail(email);
    } catch (error) {
      throw new ExternalServiceError(error);
    }
  }
}
