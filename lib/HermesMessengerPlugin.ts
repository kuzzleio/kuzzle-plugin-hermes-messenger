import {
  Plugin,
  PluginContext,
  JSONObject,
  InternalError,
} from 'kuzzle';

import { TwilioController, SendgridController } from './controllers';
import { SendgridClient, TwilioClient, MessengerClient } from './messenger-clients';

export class Clients {
  private clients = new Map<string, MessengerClient<any>>();

  /**
   * Returns the Twilio client.
   */
  get twilio (): TwilioClient {
    if (! this.clients.has('twilio')) {
      throw new InternalError('Twilio client is not available yet. Are you trying to access it before the application has started?');
    }

    return this.clients.get('twilio') as TwilioClient;
  }

  /**
   * Returns the Sendgrid client.
   */
  get sendgrid (): SendgridClient {
    if (! this.clients.has('sendgrid')) {
      throw new InternalError('Twilio client is not available yet. Are you trying to access it before the application has started?');
    }

    return this.clients.get('sendgrid') as SendgridClient;
  }

  constructor () {
    this.clients.set('twilio', new TwilioClient());
    this.clients.set('sendgrid', new SendgridClient());
  }

  async init (config: JSONObject, context: PluginContext) {
    await this.twilio.init(config, context);
    await this.sendgrid.init(config, context);
  }
}

export class HermesMessengerPlugin extends Plugin {
  private defaultConfig: JSONObject;

  private twilioController: TwilioController;
  private sendgridController: SendgridController;

  /**
   * Instantiated messenger clients
   */
  clients: Clients;

  /**
   * Constructor
   */
  constructor() {
    super({
      kuzzleVersion: '>=2.12.0 <3'
    });

    this.defaultConfig = {};

    this.clients = new Clients();
  }

  /**
   * Init the plugin
   */
  async init (config: JSONObject, context: PluginContext) {
    this.config = { ...this.defaultConfig, ...config };

    this.context = context;

    await this.clients.init(this.config, this.context)

    this.twilioController = new TwilioController(
      this.config,
      this.context,
      this.clients.twilio);
    this.sendgridController = new SendgridController(
      this.config,
      this.context,
      this.clients.sendgrid);

    this.api = {
      'hermes/twilio': this.twilioController.definition,

      'hermes/sendgrid': this.sendgridController.definition,
    };
  }
}
