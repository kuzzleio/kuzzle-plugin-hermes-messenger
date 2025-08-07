import { ExternalServiceError, NotFoundError } from "kuzzle";
import axios from "axios";
import { BaseAccount, MessengerClient } from "./MessengerClient";

export interface SMSEnvoiAccount extends BaseAccount<null> {
  options: {
    userKey: string;
    accessToken: string;
  };
}

export class SMSEnvoiClient extends MessengerClient<SMSEnvoiAccount> {
  constructor() {
    super("smsenvoi");
  }

  /**
   * Send SMS using smsenvoi.com API
   */
  async sendSms(accountName: string, recipients: string[], message: string) {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exist.`);
    }

    const account = this.getAccount(accountName);
    const { userKey: user_key, accessToken: Access_token } = account.options;

    try {
      const headers = {
        user_key,
        Access_token,
        "Content-type": "application/json",
      };

      const payload = {
        message_type: "PRM",
        message,
        recipient: recipients,
        returnCredits: true,
      };

      if (await this.mockedAccount(account.name)) {
        await this.sdk.document.createOrReplace(
          this.config.adminIndex,
          "messages",
          message,
          { account: account.name, recipients },
        );

        return;
      }

      const response = await axios.post(
        "https://api.smsenvoi.com/API/v1.0/REST/sms",
        payload,
        { headers },
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message;
      throw new ExternalServiceError(`SMSEnvoi Error: ${errorMessage}`);
    }
  }

  addAccount(name: string, userKey: string, accessToken: string) {
    const account = this._createAccount(name, userKey, accessToken);
    this.accounts.set(name, account);
  }

  protected _createAccount(
    name: string,
    userKey: string,
    accessToken: string,
  ): SMSEnvoiAccount {
    return {
      name,
      client: null,
      options: { userKey, accessToken },
    };
  }
}
