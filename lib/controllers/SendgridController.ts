import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  ControllerDefinition,
} from 'kuzzle';

import { SendgridClient } from '../messenger-clients';

export class SendgridController {
  private context: PluginContext;
  private config: JSONObject;

  private sendgridClient: SendgridClient;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    sendgridClient: SendgridClient
  ) {
    this.config = config;
    this.context = context;
    this.sendgridClient = sendgridClient;

    this.definition = {
      actions: {
        sendEmail: {
          handler: this.sendEmail.bind(this),
          http: [{ verb: 'post', path: 'hermes/sendgrid/email' }],
        },
        sendTemplatedEmail: {
          handler: this.sendTemplatedEmail.bind(this),
          http: [{ verb: 'post', path: 'hermes/sendgrid/templated-email' }],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: 'post', path: 'hermes/sendgrid/accounts' }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [{ verb: 'delete', path: 'hermes/sendgrid/account/:account' }],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: 'get', path: 'hermes/sendgrid/accounts' }],
        }
      }
    };
  }

  async sendEmail (request: KuzzleRequest) {
    const account = request.getString('account');
    const to = request.getBodyArray('to');
    const subject = request.getBodyString('subject');
    const html = request.getBodyString('html');
    const fromEmail = request.getBodyString('from', '');

    const from = fromEmail.length === 0 ? null : fromEmail;

    await this.sendgridClient.sendEmail(account, to, subject, html, { from });
  }

  async sendTemplatedEmail (request: KuzzleRequest) {
    const account = request.getString('account');
    const templateId = request.getBodyString('templateId');
    const to = request.getBodyArray('to');
    const templateData = request.getBodyObject('templateData', {});
    const fromEmail = request.getBodyString('from', '');

    const from = fromEmail.length === 0 ? null : fromEmail;

    await this.sendgridClient.sendTemplatedEmail(account, to, templateId, templateData, { from });
  }

  async addAccount (request: KuzzleRequest) {
    const account = request.getString('account');
    const apiKey = request.getBodyString('apiKey');
    const defaultSender = request.getBodyString('defaultSender');

    this.sendgridClient.addAccount(account, apiKey, defaultSender);
  }

  async removeAccount (request: KuzzleRequest) {
    const account = request.getString('account');

    this.sendgridClient.removeAccount(account);
  }

  async listAccounts () {
    const accounts = this.sendgridClient.listAccounts();

    return { accounts };
  }
}
