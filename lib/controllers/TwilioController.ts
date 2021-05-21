import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  ControllerDefinition,
} from 'kuzzle';

import { TwilioClient } from '../messenger-clients';

export class TwilioController {
  private context: PluginContext;
  private config: JSONObject;

  private twilioClient: TwilioClient;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    twilioClient: TwilioClient
  ) {
    this.config = config;
    this.context = context;
    this.twilioClient = twilioClient;

    this.definition = {
      actions: {
        sendSms: {
          handler: this.sendSms.bind(this),
          http: [{ verb: 'post', path: 'hermes/twilio/sms' }],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: 'post', path: 'hermes/twilio/accounts' }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [{ verb: 'delete', path: 'hermes/twilio/account/:accountId' }],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: 'get', path: 'hermes/twilio/accounts' }],
        }
      }
    };
  }

  async sendSms (request: KuzzleRequest) {
    const account = request.getString('account');
    const from = request.getBodyString('from');
    const to = request.getBodyString('to');
    const text = request.getBodyString('text');

    await this.twilioClient.sendSms(account, from, to, text);
  }

  async addAccount (request: KuzzleRequest) {
    const account = request.getString('account');
    const accountSid = request.getBodyString('accountSid');
    const authToken = request.getBodyString('authToken');

    this.twilioClient.addAccount(account, accountSid, authToken);
  }

  async removeAccount (request: KuzzleRequest) {
    const account = request.getString('account');

    this.twilioClient.removeAccount(account);
  }

  async listAccounts () {
    const accounts = this.twilioClient.listAccounts();

    return { accounts };
  }
}
