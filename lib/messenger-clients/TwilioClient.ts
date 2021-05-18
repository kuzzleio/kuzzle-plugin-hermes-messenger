import { Twilio } from 'twilio';
import {
  JSONObject,
  PluginContext,
  NotFoundError,
  ExternalServiceError,
  InternalError,
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

  async sendSms (from: string, to: string, text: string, { account }: { account?: string } = {}) {
    if (account && ! this.privateClients.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    const client = account ? this.privateClients.get(account) : this.commonClient;

    this.context.log.debug(`SMS (${client === this.commonClient ? account : 'common'}): FROM ${from} TO ${to}`);

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

  protected _addAccount (name: string, accountSid: string, authToken: string) {
    this.privateClients.set(name, new Twilio(accountSid, authToken));
  }

  protected _initCommonClient (accountSid: string, authToken: string) {
    if (typeof accountSid !== 'string' || typeof authToken !== 'string') {
      throw new InternalError(`Common Twilio client must be initialized with the following params: "accountSid", "authToken"`);
    }

    this._commonClient = new Twilio(accountSid, authToken);
  }
}
