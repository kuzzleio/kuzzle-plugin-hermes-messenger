import { ExternalServiceError, NotFoundError } from "kuzzle";
import axios from "axios";
import { BaseAccount, MessengerClient } from "./MessengerClient";

export interface SMSEnvoiAccount extends BaseAccount<null> {
  options: {
    userKey: string;
    accessToken: string;
    defaultSender: string;
  };
}

export class SMSEnvoiClient extends MessengerClient<SMSEnvoiAccount> {
  constructor() {
    super("smsenvoi");
  }

  /**
   * Send SMS using smsenvoi.com API
   */
  async sendSms(
    accountName: string,
    to: string,
    body: string,
    { from }: { from?: string } = {},
  ) {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exist.`);
    }

    const account = this.getAccount(accountName);

    const fromNumber = from || account.options.defaultSender;

    this.context.log.debug(`SMS (${accountName}): FROM ${fromNumber} TO ${to}`);

    try {
      await this.sendMessage(account, { from: fromNumber, to, body });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message;
      throw new ExternalServiceError(`SMSEnvoi Error: ${errorMessage}`);
    }
  }

  addAccount(
    name: string,
    userKey: string,
    accessToken: string,
    defaultSender: string,
  ) {
    super.addAccount(name, userKey, accessToken, defaultSender);
  }

  protected _createAccount(
    name: string,
    userKey: string,
    accessToken: string,
    defaultSender: string,
  ): SMSEnvoiAccount {
    return {
      name,
      client: null,
      options: { userKey, accessToken, defaultSender },
    };
  }

  private async sendMessage(account: SMSEnvoiAccount, sms: any) {
    const { userKey: user_key, accessToken: Access_token } = account.options;

    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        sms.body,
        { account: account.name, ...sms },
      );
    } else {
      const headers = {
        user_key,
        Access_token,
        "Content-type": "application/json",
      };

      const payload = {
        message_type: "PRM",
        message: sms.body,
        recipient: sms.to,
        returnCredits: true,
      };

      const response = await axios.post(
        "https://api.smsenvoi.com/API/v1.0/REST/sms",
        payload,
        { headers },
      );

      return response.data;
    }
  }
}
