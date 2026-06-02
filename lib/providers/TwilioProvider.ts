import { ExternalServiceError } from "kuzzle";
import { JSONSchema7 } from "json-schema";
import { Twilio } from "twilio";

import { BaseAccount, BaseProvider, ProviderType } from "./BaseProvider";

export interface TwilioAccount extends BaseAccount<Twilio> {
  options: {
    defaultSender: string;
  };
}

export class TwilioProvider extends BaseProvider<TwilioAccount> {
  constructor() {
    const paramsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        account_sid: {
          type: "string",
          title: "Account SID",
          minLength: 1,
        },
        auth_token: {
          type: "string",
          format: "password",
          title: "Auth Token",
          minLength: 1,
        },
        default_sender: {
          type: "string",
          title: "Default Sender",
          minLength: 1,
        },
      },
      required: ["account_sid", "auth_token", "default_sender"],
    };

    const recipientsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        to: {
          type: "string",
          title: "Phone Number",
          minLength: 1,
        },
      },
      required: ["to"],
    };

    const contentJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        body: {
          type: "string",
          title: "Message",
          minLength: 1,
        },
      },
      required: ["body"],
    };

    super(
      "twilio",
      ProviderType.SMS,
      paramsJsonSchema,
      recipientsJsonSchema,
      contentJsonSchema,
    );
  }

  /**
   * Sends an SMS to each recipient using one of the registered Twilio accounts.
   *
   * @param accountName - Name of the registered account to use
   * @param recipients - Array of recipient objects with `to` (phone number)
   * @param content - SMS content: `body`
   * @param params.from - Sender override; falls back to the account's `default_sender`
   */
  async send(
    accountName: string,
    recipients: any[],
    content: any,
    { from }: { from?: string } = {},
  ) {
    const account = this.getAccount(accountName);
    const fromNumber = from || account.options.defaultSender;

    try {
      for (const recipient of recipients) {
        this.context.log.debug(
          `SMS (${accountName}): FROM ${fromNumber} TO ${recipient.to}`,
        );
        await this.sendMessage(account, {
          from: fromNumber,
          to: recipient.to,
          body: content.body,
        });
      }
    } catch (error) {
      this.context.log.warn(
        `An error occured while trying to send a message: ${JSON.stringify(error, null, 2)}`,
      );
      throw new ExternalServiceError(error);
    }
  }

  protected _createAccount(
    name: string,
    {
      account_sid,
      auth_token,
      default_sender,
    }: {
      account_sid: string;
      auth_token: string;
      default_sender: string;
      [key: string]: unknown;
    },
  ): TwilioAccount {
    return {
      provider: new Twilio(account_sid, auth_token),
      name,
      options: {
        defaultSender: default_sender,
      },
    };
  }

  private async sendMessage(
    account: TwilioAccount,
    sms: { from: string; to: string; body: string },
  ) {
    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        sms.body,
        { account: account.name, ...sms },
      );
    } else {
      await account.provider.messages.create(sms);
    }
  }

  private async mockedAccount(accountName: string): Promise<boolean> {
    const mockedAccounts = (this.config.mockedAccounts as string[]) ?? [];
    return mockedAccounts.includes(accountName);
  }
}
