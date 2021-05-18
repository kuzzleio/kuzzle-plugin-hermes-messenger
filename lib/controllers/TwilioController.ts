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

  }

  async addAccount (request: KuzzleRequest) {

  }

  async removeAccount (request: KuzzleRequest) {

  }

  async listAccounts (request: KuzzleRequest) {

  }
}
