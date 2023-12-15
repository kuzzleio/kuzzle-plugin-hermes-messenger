import { ExternalServiceError } from "kuzzle";
import { BaseAccount, MessengerClient } from "./MessengerClient";

import { Transporter, createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { Attachment } from "../types";

export interface SMTPAccount
  extends BaseAccount<Transporter<SMTPTransport.SentMessageInfo>> {
  options: {
    /**
     * Default sender email address
     */
    defaultSender: string;
  };
}

export enum SMTPClientSSLMode {
  /**
   * Do not use SSL
   */
  NONE = "none",
  /**
   * Use StartTLS
   */
  STARTTLS = "starttls",
  /**
   * Use TLS on dedicated port
   */
  TLS = "tls",
}

export class SMTPClient extends MessengerClient<SMTPAccount> {
  constructor() {
    super("smtp");
  }

  /**
   * Sends an email using one of the registered accounts.
   *
   * @param accountName Account name
   * @param to Recipient email(s)
   * @param subject Email subject
   * @param html Email content
   * @param options.from Sender email
   */
  async sendEmail(
    accountName: string,
    to: string[],
    subject: string,
    html: string,
    { attachments, from }: { attachments?: Attachment[]; from?: string } = {}
  ) {
    const account = this.getAccount(accountName);

    const fromEmail = from || account.options.defaultSender;

    const email: Mail.Options = {
      attachments,
      from: fromEmail,
      html,
      subject,
      to,
    };

    this.context.log.debug(
      `EMAIL (${accountName}): FROM ${fromEmail} TO ${to.join(
        ", "
      )} SUBJECT ${subject}`
    );

    try {
      await this.sendMessage(account, email);
    } catch (error) {
      if (error.response) {
        throw new ExternalServiceError(
          "SMTP " + JSON.stringify(error.response.body)
        );
      }

      throw new ExternalServiceError(error);
    }
  }

  /**
   * Adds an account to send email with.
   *
   * @param name Account name
   * @param host SMTP server host
   * @param port SMTP server port
   * @param user SMTP server username
   * @param pass SMTP server password
   * @param defaultSender Default sender email address
   */
  override addAccount(
    name: string,
    host: string,
    port: number,
    user: string,
    pass: string,
    defaultSender: string,
    ssl: SMTPClientSSLMode = SMTPClientSSLMode.NONE
  ) {
    super.addAccount(name, host, port, user, pass, defaultSender, ssl);
  }

  protected _createAccount(
    name,
    host: string,
    port: number,
    user: string,
    pass: string,
    defaultSender: string,
    ssl: SMTPClientSSLMode = SMTPClientSSLMode.NONE
  ): SMTPAccount {
    const transporter = createTransport({
      auth: {
        pass,
        user,
      },
      host,
      port,
      secure: ssl === SMTPClientSSLMode.TLS,
      requireTLS: ssl === SMTPClientSSLMode.STARTTLS,
      ignoreTLS: ssl === SMTPClientSSLMode.NONE,
    });

    return {
      client: transporter,
      name,
      options: {
        defaultSender,
      },
    };
  }

  private async sendMessage(account: SMTPAccount, email: any) {
    if (await this.mockedAccount(account.name)) {
      await this.sdk.document.createOrReplace(
        this.config.adminIndex,
        "messages",
        email.subject || email.templateId,
        { account: account.name, ...email }
      );
    } else {
      try {
        await account.client.verify();
      } catch (error) {
        throw new ExternalServiceError(error);
      }

      return account.client.sendMail(email);
    }
  }
}
