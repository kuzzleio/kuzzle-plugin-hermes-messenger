import { MailService } from '@sendgrid/mail';
import {
  NotFoundError,
  ExternalServiceError,
  JSONObject,
} from 'kuzzle';

import { MessengerClient } from './MessengerClient';


export class SendgridClient extends MessengerClient<MailService> {
  constructor () {
    super('sengrid');
  }

  /**
   * Sends an email using one of the registered accounts.
   *
   * @param account Account name
   * @param from Sender email
   * @param to Recipient email(s)
   * @param subject Email subject
   * @param html Email content
   */
  async sendEmail (account: string, from: string, to: string[], subject: string, html: string) {
    const client = this.getClient(account);

    const email = { from, to, subject, html };

    this.context.log.debug(`EMAIL (${client}): FROM ${from} TO ${to.join(', ')} SUBJECT ${subject}`);

    try {
      await client.sendMultiple(email);
    }
    catch (error) {
      if (error.response) {
        throw new ExternalServiceError(error.response.body)
      }

      throw new ExternalServiceError(error);
    }
  }

  /**
   * Sends a tempated email using one of the registered accounts.
   *
   * @param account Account name
   * @param from Sender email
   * @param to Recipient email(s)
   * @param templateId Template ID
   * @param templateData Template placeholders values
   */
  async sendTemplatedEmail (account: string, from: string, to: string[], templateId: string, templateData: JSONObject) {
    const client = this.getClient(account);

    const email = { from, to, templateId, dynamic_template_data: templateData };

    this.context.log.debug(`EMAIL (${client}): FROM ${from} TO ${to.join(', ')} TEMPLATE ${templateId}`);

    try {
      await client.sendMultiple(email);
    }
    catch (error) {
      if (error.response) {
        throw new ExternalServiceError(error.response.body)
      }

      throw new ExternalServiceError(error);
    }
  }

  /**
   * Adds an account to send email with.
   *
   * @param name Account name
   * @param apiKey Sendgrid API key
   */
   addAccount (name: string, apiKey: string) {
    super.addAccount(name, apiKey);
  }

  private getClient (account: string): MailService {
    if (! this.accounts.has(account)) {
      throw new NotFoundError(`Account "${account}" does not exists.`);
    }

    return this.accounts.get(account);
  }

  protected _createAccount (apiKey: string): MailService {
    const mailService = new MailService();

    mailService.setApiKey(apiKey);

    return mailService;
  }
}
