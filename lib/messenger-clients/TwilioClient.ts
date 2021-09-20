import { Twilio } from 'twilio';
import {
  JSONObject,
  PluginContext,
  NotFoundError,
  ExternalServiceError,
} from 'kuzzle';

import { MessengerClient } from './MessengerClient';

export class TwilioClient extends MessengerClient<Twilio> {
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
   * @param account Account name
   * @param from Twilio phone number
   * @param to Recipient phone number
   * @param body SMS content
   */
  async sendSms (account: string, from: string, to: string, body: string) {
    if (account && ! this.accounts.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    const client = this.accounts.get(account);

    this.context.log.debug(`SMS (${account}): FROM ${from} TO ${to}`);

    try {
      await client.messages.create({ from, to, body });
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
   */
  addAccount (name: string, accountSid: string, authToken: string) {
    super.addAccount(name, accountSid, authToken);
  }

  protected _createAccount (accountSid: string, authToken: string) {
    return new Twilio(accountSid, authToken);
  }
}
