import { ExternalServiceError } from "kuzzle";
import { JSONSchema7 } from "json-schema";
import { Twilio } from "twilio";

import { BaseAccount, BaseProvider } from "./BaseProvider";
import { PROVIDER_CAPABILITY_TEXT, ProviderCapabilities } from "../types";

export interface TwilioAccountParams {
  account_sid: string;
  auth_token: string;
  default_sender: string;
  [key: string]: unknown;
}

export type TwilioAccount = BaseAccount<Twilio, TwilioAccountParams>;

export class TwilioProvider extends BaseProvider<TwilioAccount> {
  override capabilities: ProviderCapabilities = [PROVIDER_CAPABILITY_TEXT];
  constructor() {
    const accountParamsSchema: JSONSchema7 = {
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

    const messageContentSchema: JSONSchema7 = {
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

    const messageAdditionalParamsSchema: JSONSchema7 = {
      type: "object",
      additionalProperties: false,
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "Twilio",
      ["phoneNumber"],
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );
  }

  /**
   * Sends an SMS to each recipient using one of the registered Twilio accounts.
   *
   * @param accountName - Name of the registered account to use
   * @param recipients - Recipient phone numbers (E.164)
   * @param content - SMS content: `body`
   * @param params.from - Sender override; falls back to the account's `default_sender`
   */
  async sendMessage(
    accountName: string,
    recipients: string[],
    content: any,
    { from }: { from?: string } = {},
  ) {
    const account = this.getAccount(accountName);
    const fromNumber = from || account.params.default_sender;

    try {
      for (const to of recipients) {
        this.context.log.debug(
          `SMS (${accountName}): FROM ${fromNumber} TO ${to}`,
        );
        await this.deliver(account, {
          from: fromNumber,
          to,
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
    accountId: string,
    params: TwilioAccountParams,
  ): TwilioAccount {
    return {
      accountId,
      provider: new Twilio(params.account_sid, params.auth_token),
      params,
    };
  }

  private async deliver(
    account: TwilioAccount,
    sms: { from: string; to: string; body: string },
  ) {
    if (await this.mockedAccount(account.accountId)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        sms.body,
        { account: account.accountId, ...sms },
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
