import { ExternalServiceError, NotFoundError } from "kuzzle";
import axios from "axios";
import { BaseAccount, MessengerClient } from "./MessengerClient";

export interface SMSEnvoiAccount extends BaseAccount<null> {
  options: {
    email: string;
    password: string;
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
    const { email, password } = account.options;

    try {
      const tokenResponse = await axios.get<string>(
        "https://api.smsenvoi.com/API/v1.0/REST/token",
        {
          auth: {
            username: email,
            password: password,
          },
        },
      );

      const tokenParts = tokenResponse.data.split(";");
      if (tokenParts.length < 2) {
        throw new Error("Invalid token format received from SMSEnvoi.");
      }

      const headers = {
        user_key: tokenParts[0],
        Access_token: tokenParts[1],
        "Content-type": "application/json",
      };

      const payload = {
        message_type: "PRM",
        message,
        recipient: recipients,
        returnCredits: true,
      };

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

  addAccount(name: string, email: string, password: string) {
    const account = this._createAccount(name, email, password);
    this.accounts.set(name, account);
  }

  protected _createAccount(
    name: string,
    email: string,
    password: string,
  ): SMSEnvoiAccount {
    return {
      name,
      client: null,
      options: { email, password },
    };
  }
}
