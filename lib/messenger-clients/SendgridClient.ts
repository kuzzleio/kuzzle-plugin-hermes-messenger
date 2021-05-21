import { MailService } from '@sendgrid/mail';
import {
  NotFoundError,
  ExternalServiceError,
} from 'kuzzle';

import { MessengerClient } from './MessengerClient';


export class SendgridClient extends MessengerClient<MailService> {
  constructor () {
    super('sengrid');
  }

  async sendEmail (account: string, from: string, to: string, subject: string, html: string) {
    if (account && ! this.accounts.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    const client = this.accounts.get(account);

    const email = {
      from,
      to,
      subject,
      html,
    };

    this.context.log.debug(`EMAIL (${client}): FROM ${from} TO ${to} SUBJECT ${subject}`);

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

  protected _createAccount (apiKey: string): MailService {
    const mailService = new MailService();

    mailService.setApiKey(apiKey);

    return mailService;
  }
}
