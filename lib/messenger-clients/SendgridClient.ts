import { MailService } from '@sendgrid/mail';
import {
  NotFoundError,
  ExternalServiceError,
  InternalError,
} from 'kuzzle';

import { MessengerClient } from './MessengerClient';


export class SendgridClient extends MessengerClient<MailService> {
  constructor () {
    super('sengrid');
  }

  async sendEmail (account: string, from: string, to: string, subject: string, html: string) {
    if (account && ! this.privateClients.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    const client = account ? this.privateClients.get(account) : this.commonClient;

    const email = {
      from,
      to,
      subject,
      html,
    };

    this.context.log.debug(`EMAIL (${client === this.commonClient ? account : 'common'}): FROM ${from} TO ${to} SUBJECT ${subject}`);

    try {
      await client.send(email);
    }
    catch (error) {
      if (error.response) {
        throw new ExternalServiceError(error.response.body)
      }

      throw new ExternalServiceError(error);
    }
  }

  protected _addAccount (name: string, apiKey: string) {
    this.privateClients.set(name, new MailService());
    this.privateClients.get(name).setApiKey(apiKey);
  }

  protected _initCommonClient (apiKey: string) {
    if (typeof apiKey !== 'string') {
      throw new InternalError(`Common Sendgrid client must be initialized with the following params: "apiKey"`);
    }

    const Ctor = this.getClientCtor();
    this._commonClient = new Ctor();
    this._commonClient.setApiKey(apiKey);
  }

  protected getClientCtor() {
    return MailService;
  }
}
