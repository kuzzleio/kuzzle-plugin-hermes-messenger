import { ExternalServiceError } from "kuzzle";
import { MailService } from "@sendgrid/mail";
import { JSONSchema7 } from "json-schema";

import { Attachment, SendgridAttachment } from "../types";
import { BaseAccount, BaseProvider, ProviderType } from "./BaseProvider";

export interface SendgridAccount extends BaseAccount<MailService> {
  options: {
    defaultSender: string;
  };
}

export class SendgridProvider extends BaseProvider<SendgridAccount> {
  override supportAttachment = true;
  override messageType: "short" | "long" = "long";

  constructor() {
    const paramsJsonSchema: JSONSchema7 = {
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

    const recipientsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        to: {
          type: "string",
          title: "Email",
          pattern: String.raw`^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$`,
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

    const sendParamsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        from: { type: "string" },
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
      "sendgrid",
      ProviderType.EMAIL,
      paramsJsonSchema,
      recipientsJsonSchema,
      contentJsonSchema,
      sendParamsJsonSchema,
    );
  }

  async send(
    accountName: string,
    recipients: any[],
    content: any,
    { from, attachments }: { from?: string; attachments?: Attachment[] } = {},
  ): Promise<void> {
    const account = this.getAccount(accountName);
    const fromEmail = from || account.options.defaultSender;
    const to = recipients.map((r) => r.to);

    const email = {
      from: fromEmail,
      to,
      subject: content.subject,
      html: content.message,
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
      await this.sendMessage(account, email);
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
    name: string,
    {
      api_key,
      default_sender,
    }: {
      api_key: string;
      default_sender: string;
      [key: string]: unknown;
    },
  ): SendgridAccount {
    const mailService = new MailService();
    mailService.setApiKey(api_key);

    return {
      name,
      provider: mailService,
      options: {
        defaultSender: default_sender,
      },
    };
  }

  private async sendMessage(
    account: SendgridAccount,
    email: object,
  ): Promise<void> {
    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        (email as any).subject,
        { account: account.name, ...email },
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
