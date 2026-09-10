import { ExternalServiceError } from "kuzzle";
import { MailService } from "@sendgrid/mail";
import { JSONSchema7 } from "json-schema";

import {
  Attachment,
  PROVIDER_CAPABILITY_FILE,
  PROVIDER_CAPABILITY_HTML,
  PROVIDER_CAPABILITY_TEXT,
  ProviderCapabilities,
  SendgridAttachment,
} from "../types";
import { BaseAccount, BaseProvider } from "./BaseProvider";
import { emailBody } from "./SmtpProvider";

export interface SendgridAccountParams {
  api_key: string;
  default_sender: string;
  [key: string]: unknown;
}

export type SendgridAccount = BaseAccount<MailService, SendgridAccountParams>;

export class SendgridProvider extends BaseProvider<SendgridAccount> {
  override capabilities: ProviderCapabilities = [
    PROVIDER_CAPABILITY_TEXT,
    PROVIDER_CAPABILITY_HTML,
    PROVIDER_CAPABILITY_FILE,
  ];

  constructor() {
    const accountParamsSchema: JSONSchema7 = {
      type: "object",
      properties: {
        api_key: {
          type: "string",
          format: "password",
          title: "API Key",
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
      required: ["api_key", "default_sender"],
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
      "SendGrid",
      ["email"],
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );
  }

  async sendMessage(
    accountName: string,
    recipients: string[],
    content: any,
    {
      from,
      attachments,
      cc,
      bcc,
    }: {
      from?: string;
      attachments?: Attachment[];
      cc?: string[];
      bcc?: string[];
    } = {},
  ): Promise<void> {
    const account = this.getAccount(accountName);
    const fromEmail = from || account.params.default_sender;
    const to = recipients;

    const email = {
      from: fromEmail,
      to,
      cc,
      bcc,
      subject: content.subject,
      ...emailBody(content),
      attachments: attachments?.map(
        (att): SendgridAttachment => ({
          content: att.content,
          type: att.contentType,
          filename: att.filename,
          disposition: att.contentDisposition,
          content_id: att.cid,
        }),
      ),
    };

    this.context.log.debug(
      `EMAIL (${accountName}): FROM ${fromEmail} TO ${to.join(", ")} SUBJECT ${content.subject} ATTACHMENTS ${attachments?.length ?? 0}`,
    );

    try {
      await this.deliver(account, email);
    } catch (error: any) {
      if (error.response) {
        throw new ExternalServiceError(
          "Sendgrid " + JSON.stringify(error.response.body),
        );
      }
      throw new ExternalServiceError(error);
    }
  }

  protected _createAccount(
    accountId: string,
    params: SendgridAccountParams,
  ): SendgridAccount {
    const mailService = new MailService();
    mailService.setApiKey(params.api_key);

    return { accountId, provider: mailService, params };
  }

  private async deliver(
    account: SendgridAccount,
    email: object,
  ): Promise<void> {
    if (await this.mockedAccount(account.accountId)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        (email as any).subject,
        { account: account.accountId, ...email },
      );
    } else {
      await account.provider.sendMultiple(email as any);
    }
  }

  private async mockedAccount(accountName: string): Promise<boolean> {
    const mockedAccounts = (this.config.mockedAccounts as string[]) ?? [];
    return mockedAccounts.includes(accountName);
  }
}
