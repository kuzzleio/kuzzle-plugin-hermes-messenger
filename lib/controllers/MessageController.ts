import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  BadRequestError,
  ControllerDefinition,
} from 'kuzzle';

import { TwilioService } from '../messenger-clients';

export class MessageController {
  private context: PluginContext;
  private config: JSONObject;

  private twilioService: TwilioService;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    twilioService: TwilioService
  ) {
    this.config = config;
    this.context = context;
    this.twilioService = twilioService;

    this.definition = {
      actions: {
        sms: {
          handler: this.sms.bind(this),
          http: [{ verb: 'post', path: 'twilio/sms' }],
        },
        email: {
          handler: this.email.bind(this),
          http: [{ verb: 'post', path: 'twilio/email' }],
        },
      }
    };
  }

  async sms (request: KuzzleRequest) {

  }

  async email (request: KuzzleRequest) {

  }
}
