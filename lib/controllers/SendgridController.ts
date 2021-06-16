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
    const from = request.getBodyString('from');
    const to = request.getBodyArray('to');
    const subject = request.getBodyString('subject');
    const html = request.getBodyString('html');

    await this.sendgridClient.sendEmail(account, from, to, subject, html);
  }

  async addAccount (request: KuzzleRequest) {
    const account = request.getString('account');
    const apiKey = request.getBodyString('apiKey');

    this.sendgridClient.addAccount(account, apiKey);
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
