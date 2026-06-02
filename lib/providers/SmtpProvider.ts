import { ExternalServiceError } from "kuzzle";
import { JSONSchema7 } from "json-schema";
import { Transporter, createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { Attachment } from "../types";
import { BaseAccount, BaseProvider, ProviderType } from "./BaseProvider";

export interface SMTPAccount extends BaseAccount<
  Transporter<SMTPTransport.SentMessageInfo>
> {
  options: {
    defaultSender: string;
  };
}

export class SmtpProvider extends BaseProvider<SMTPAccount> {
  readonly canExport = true;

  constructor() {
    const paramsJsonSchema: JSONSchema7 = {
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

    const recipientsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        to: {
          type: "string",
          title: "Email",
          pattern: String.raw`^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$`,
        },
        cc: {
          type: "string",
          title: "Cc",
        },
        bcc: {
          type: "string",
          title: "Bcc",
        },
      },
      required: ["to"],
    };

    const contentJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        subject: {
          type: "string",
          title: "Subject",
        },
        message: {
          type: "string",
          title: "Message",
        },
      },
      required: ["subject", "message"],
    };

    super(
      "smtp",
      ProviderType.EMAIL,
      paramsJsonSchema,
      recipientsJsonSchema,
      contentJsonSchema,
    );
  }

  /**
   * Sends an email using one of the registered SMTP accounts.
   *
   * @param accountName - Name of the registered account to use
   * @param recipients - Array of recipient objects with `to` (required), `cc` and `bcc` (optional)
   * @param content - Email content: `subject` and `message` (HTML)
   * @param params.from - Sender override; falls back to the account's `default_sender`
   * @param params.attachments - Optional file attachments
   */
  async send(
    accountName: string,
    recipients: any[],
    content: any,
    { attachments, from }: { attachments?: Attachment[]; from?: string } = {},
  ) {
    const account = this.getAccount(accountName);
    const fromEmail = from || account.options.defaultSender;

    const email: Mail.Options = {
      attachments,
      from: fromEmail,
      subject: content.subject,
      html: content.message,
      to: recipients.map((r) => r.to).join(", "),
    };

    try {
      await this.sendMessage(account, email);
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
   * Only `defaultSender` is exposed in `options`; credentials are never stored there.
   */
  protected _createAccount(
    name: string,
    {
      host_name,
      port,
      user,
      password,
      default_sender,
    }: {
      host_name: string;
      port: number;
      user: string;
      password: string;
      default_sender: string;
      [key: string]: unknown;
    },
  ): SMTPAccount {
    const transporter = createTransport({
      auth: {
        pass: password,
        user,
      },
      host: host_name,
      port,
      secure: port === 465,
    });

    return {
      provider: transporter,
      name,
      options: {
        defaultSender: default_sender,
      },
    };
  }

  private async sendMessage(account: SMTPAccount, email: Mail.Options) {
    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        (email.subject as string) || (email as any).templateId,
        { account: account.name, ...email },
      );
    } else {
      try {
        await account.provider.verify();
      } catch (error) {
        throw new ExternalServiceError(error);
      }

      return account.provider.sendMail(email);
    }
  }

  private async mockedAccount(accountName: string): Promise<boolean> {
    const mockedAccounts = (this.config.mockedAccounts as string[]) ?? [];
    return mockedAccounts.includes(accountName);
  }
}
