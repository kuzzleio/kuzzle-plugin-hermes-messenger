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

  async sendSms (account: string, from: string, to: string, text: string) {
    if (account && ! this.accounts.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    const client = this.accounts.get(account);

    this.context.log.debug(`SMS (${account}): FROM ${from} TO ${to}`);

    try {
      await client.messages.create({
        from,
        to,
        body: text
      });
    }
    catch (error) {
      throw new ExternalServiceError(error);
    }
  }

  protected _createAccount (accountSid: string, authToken: string) {
    return new Twilio(accountSid, authToken);
  }
}
