import { ExternalServiceError, NotFoundError } from "kuzzle";
import axios from "axios";
import { JSONSchema7 } from "json-schema";

import { BaseAccount, BaseProvider, ProviderType } from "./BaseProvider";
import { RecipientTypeRegistry } from "../recipients";

export interface SMSEnvoiAccount extends BaseAccount<null> {
  options: {
    userKey: string;
    accessToken: string;
    defaultSender: string;
  };
}

export class SMSEnvoiProvider extends BaseProvider<SMSEnvoiAccount> {
  constructor(recipientTypeRegistry: RecipientTypeRegistry) {
    const paramsJsonSchema: JSONSchema7 = {
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

    const contentJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        message: {
          type: "string",
          title: "Message",
        },
      },
      required: ["message"],
    };

    const sendParamsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "smsenvoi",
      ProviderType.SMS,
      ["phoneNumber"],
      paramsJsonSchema,
      contentJsonSchema,
      sendParamsJsonSchema,
      recipientTypeRegistry,
    );
  }

  async send(
    accountName: string,
    recipients: any[],
    content: any,
    { from }: { from?: string } = {},
  ): Promise<void> {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exist.`);
    }

    const account = this.getAccount(accountName);
    const fromNumber = from || account.options.defaultSender;
    const phoneNumbers = recipients.map((recipient) => recipient.to);

    try {
      await this.sendMessage(
        account,
        phoneNumbers,
        content.message,
        fromNumber,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || error;
      throw new ExternalServiceError(`SMSEnvoi Error: ${errorMessage}`);
    }
  }

  protected _createAccount(
    name: string,
    {
      user_key,
      access_token,
      default_sender,
    }: {
      user_key: string;
      access_token: string;
      default_sender: string;
      [key: string]: unknown;
    },
  ): SMSEnvoiAccount {
    return {
      name,
      provider: null,
      options: {
        userKey: user_key,
        accessToken: access_token,
        defaultSender: default_sender,
      },
    };
  }

  private async sendMessage(
    account: SMSEnvoiAccount,
    phoneNumbers: string[],
    message: string,
    fromNumber: string,
  ): Promise<void> {
    const { userKey: user_key, accessToken: Access_token } = account.options;

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
