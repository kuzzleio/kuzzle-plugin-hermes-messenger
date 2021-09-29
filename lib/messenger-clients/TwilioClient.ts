import { Twilio } from 'twilio';
import {
  JSONObject,
  PluginContext,
  NotFoundError,
  ExternalServiceError,
} from 'kuzzle';

import { MessengerClient, BaseAccount } from './MessengerClient';

export interface TwilioAccount extends BaseAccount<Twilio> {
  options: {
    /**
     * Default sender phone number
     */
    defaultSender: string;
  }
}


export class TwilioClient extends MessengerClient<TwilioAccount> {
  constructor () {
    super('twilio');
  }

  async init (config: JSONObject, context: PluginContext) {
    this.config = config;
    this.context = context;
  }

  /**
   * Sends a SMS using one of the registered accounts.
   *
   * @param accountName Account name
   * @param to Recipient phone number
   * @param body SMS content
   * @param options.from Twilio phone number
   */
  async sendSms (
    accountName: string, 
    to: string, 
    body: string, 
    { from }: { from?: string } = {}
  ) {
    if (accountName && ! this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exists.`);
    }

    const account = this.getAccount(accountName);

    const fromNumber = from || account.options.defaultSender; 

    this.context.log.debug(`SMS (${accountName}): FROM ${fromNumber} TO ${to}`);

    try {
      await this.sendMessage(account, { from: fromNumber, to, body });
    }
    catch (error) {
      throw new ExternalServiceError(error);
    }
  }

  /**
   * Adds an account to send email with.
   *
   * @param name Account name
   * @param accountSid Twilio account sid
   * @param authToken Twilio auth token
   * @param defaultSender Default number to send SMS
   */
  addAccount (name: string, accountSid: string, authToken: string, defaultSender: string) {
    super.addAccount(name, accountSid, authToken, defaultSender);
  }

  protected _createAccount (name: string, accountSid: string, authToken: string, defaultSender: string) {
    return {
      name,
      client: new Twilio(accountSid, authToken),
      options: {
        defaultSender,
      },
    };
  }

  private async sendMessage (account: TwilioAccount, sms: any) {
    if (this.config.mockMessages) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex, 
        'messages', 
        sms.body,
        { account: account.name, ...sms });
    }
    else {
      await account.client.messages.create(sms);
    }
  }
}
