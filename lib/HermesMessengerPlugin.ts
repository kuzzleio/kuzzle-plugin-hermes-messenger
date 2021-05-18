import {
  Plugin,
  PluginContext,
  JSONObject,
} from 'kuzzle';

import { TwilioController, SendgridController } from './controllers';
import { SendgridClient, TwilioClient, MessengerClient } from './messenger-clients';

export class HermesMessengerPlugin extends Plugin {
  private defaultConfig: JSONObject;

  private twilioController: TwilioController;
  private sendgridController: SendgridController;

  clients = new Map<string, MessengerClient<any>>()

  /**
   * Constructor
   */
  constructor() {
    super({
      kuzzleVersion: '>=2.12.0 <3'
    });

    this.defaultConfig = {};
  }

  /**
   * Init the plugin
   */
  async init (config: JSONObject, context: PluginContext) {
    this.config = { ...this.defaultConfig, ...config };

    this.context = context;

    this.clients.set('twilio', new TwilioClient());
    this.clients.set('sendgrid', new SendgridClient());

    await this.clients.get('twilio').init(this.config, context);
    await this.clients.get('sendgrid').init(this.config, context);

    this.twilioController = new TwilioController(
      this.config,
      context,
      this.clients.get('twilio') as TwilioClient);
    this.sendgridController = new SendgridController(
      this.config,
      context,
      this.clients.get('sendgrid') as SendgridClient);

    this.api = {
      'hermes/twilio': this.twilioController.definition,

      'hermes/sendgrid': this.sendgridController.definition,
    };
  }
}
