import { ExternalServiceError, NotFoundError } from "kuzzle";
import axios from "axios";
import { JSONSchema7 } from "json-schema";

import { BaseAccount, BaseProvider } from "./BaseProvider";
import { PROVIDER_CAPABILITY_TEXT, ProviderCapabilities } from "../types";

export interface SMSEnvoiAccountParams {
  user_key: string;
  access_token: string;
  default_sender: string;
  [key: string]: unknown;
}

/** SMS Envoi is a plain HTTP API: there is no client, credentials are read from `params`. */
export type SMSEnvoiAccount = BaseAccount<null, SMSEnvoiAccountParams>;

export class SMSEnvoiProvider extends BaseProvider<SMSEnvoiAccount> {
  override capabilities: ProviderCapabilities = [PROVIDER_CAPABILITY_TEXT];
  constructor() {
    const accountParamsSchema: JSONSchema7 = {
      type: "object",
      properties: {
        user_key: {
          type: "string",
          title: "User Key",
        },
        access_token: {
          type: "string",
          title: "Access Token",
        },
        default_sender: {
          type: "string",
          title: "Default Sender",
        },
      },
      required: ["user_key", "access_token", "default_sender"],
    };

    const messageContentSchema: JSONSchema7 = {
      type: "object",
      properties: {
        message: {
          type: "string",
          title: "Message",
        },
      },
      required: ["message"],
    };

    const messageAdditionalParamsSchema: JSONSchema7 = {
      type: "object",
      additionalProperties: false,
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "SMS Envoi",
      ["phoneNumber"],
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );
  }

  async sendMessage(
    accountName: string,
    recipients: string[],
    content: any,
    { from }: { from?: string } = {},
  ): Promise<void> {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exist.`);
    }

    const account = this.getAccount(accountName);
    const fromNumber = from || account.params.default_sender;
    try {
      await this.deliver(account, recipients, content.message, fromNumber);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || error;
      throw new ExternalServiceError(`SMSEnvoi Error: ${errorMessage}`);
    }
  }

  protected _createAccount(
    name: string,
    params: SMSEnvoiAccountParams,
  ): SMSEnvoiAccount {
    return { name, provider: null, params };
  }

  private async deliver(
    account: SMSEnvoiAccount,
    phoneNumbers: string[],
    message: string,
    fromNumber: string,
  ): Promise<void> {
    const { user_key, access_token: Access_token } = account.params;

    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        message,
        { account: account.name },
      );
      return;
    }

    const headers = {
      user_key,
      Access_token,
      "Content-type": "application/json",
    };

    const payload = {
      message_type: "PRM",
      message,
      recipient: phoneNumbers,
      returnCredits: true,
      sender: fromNumber,
    };

    await axios.post("https://api.smsenvoi.com/API/v1.0/REST/sms", payload, {
      headers,
    });
  }

  private async mockedAccount(accountName: string): Promise<boolean> {
    const mockedAccounts = (this.config.mockedAccounts as string[]) ?? [];
    return mockedAccounts.includes(accountName);
  }
}
