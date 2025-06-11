import { MailService } from "@sendgrid/mail";
import { ExternalServiceError, JSONObject } from "kuzzle";

import { BaseAccount, MessengerClient } from "./MessengerClient";
import { SendgridAttachment } from "lib/types";

export interface SendgridAccount extends BaseAccount<MailService> {
  options: {
    /**
     * Default sender email address
     */
    defaultSender: string;
  };
}

export class SendgridClient extends MessengerClient<SendgridAccount> {
  constructor() {
    super("sendgrid");
  }

  /**
   * Sends an email using one of the registered accounts.
   *
   * @param accountName Account name
   * @param to Recipient email(s)
   * @param subject Email subject
   * @param html Email content
   * @param options.from Sender email
   * @param options.attachments Attachments to be included in the email
   */
  async sendEmail(
    accountName: string,
    to: string[],
    subject: string,
    html: string,
    {
      from,
      attachments,
    }: { from?: string; attachments?: SendgridAttachment[] } = {},
  ) {
    const account = this.getAccount(accountName);

    const fromEmail = from || account.options.defaultSender;

    const email = {
      from: fromEmail,
      to,
      subject,
      html,
      attachments,
    };

    this.context.log.debug(
      `EMAIL (${accountName}): FROM ${fromEmail} TO ${to.join(
        ", ",
      )} SUBJECT ${subject} ATTACHMENTS ${attachments?.length || 0}`,
    );

    try {
      await this.sendMessage(account, email);
    } catch (error) {
      if (error.response) {
        throw new ExternalServiceError(
          "Sendgrid " + JSON.stringify(error.response.body),
        );
      }

      throw new ExternalServiceError(error);
    }
  }

  /**
   * Sends a templated email using one of the registered accounts.
   *
   * @param accountName Account name
   * @param to Recipient email(s)
   * @param templateId Template ID
   * @param templateData Template placeholders values
   * @param options.from Sender email
   * @param options.attachments Attachments to be included in the email
   */
  async sendTemplatedEmail(
    accountName: string,
    to: string[],
    templateId: string,
    templateData: JSONObject,
    {
      from,
      attachments,
    }: { from?: string; attachments?: SendgridAttachment[] } = {},
  ) {
    const account = this.getAccount(accountName);

    const fromEmail = from || account.options.defaultSender;

    const email = {
      from: fromEmail,
      to,
      templateId,
      dynamic_template_data: templateData,
      attachments,
    };

    this.context.log.debug(
      `EMAIL (${accountName}): FROM ${fromEmail} TO ${to.join(
        ", ",
      )} TEMPLATE ${templateId} ATTACHMENTS ${attachments?.length || 0}`,
    );

    try {
      await this.sendMessage(account, email);
    } catch (error) {
      if (error.response) {
        throw new ExternalServiceError(error.response.body);
      }

      throw new ExternalServiceError(error);
    }
  }

  /**
   * Adds an account to send email with.
   *
   * @param name Account name
   * @param apiKey Sendgrid API key
   * @param defaultSender Default sender email address
   */
  addAccount(name: string, apiKey: string, defaultSender: string) {
    super.addAccount(name, apiKey, defaultSender);
  }

  protected _createAccount(name, apiKey: string, defaultSender: string) {
    const mailService = new MailService();

    mailService.setApiKey(apiKey);

    return {
      name,
      client: mailService,
      options: {
        defaultSender,
      },
    };
  }

  private async sendMessage(account: SendgridAccount, email) {
    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        email.subject || email.templateId,
        { account: account.name, ...email },
      );
    } else {
      await account.client.sendMultiple(email);
    }
  }
}
