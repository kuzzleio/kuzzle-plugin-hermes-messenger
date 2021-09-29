import _ from 'lodash';
import {
  Plugin,
  PluginContext,
  JSONObject,
  InternalError,
  Mutex,
} from 'kuzzle';

import { TwilioController, SendgridController } from './controllers';
import { SendgridClient, TwilioClient, MessengerClient } from './messenger-clients';

export class MessengerClients {
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
  clients: MessengerClients;

  /**
   * Constructor
   */
  constructor() {
    super({
      kuzzleVersion: '>=2.12.0 <3'
    });

    this.defaultConfig = {
      adminIndex: 'hermes-messenger',
      mockMessages: false,
      collections: {
        messages: {
          dynamic: 'strict',
          properties: {
            account: { type: 'keyword' },
            from: { type: 'keyword' },
            to: { type: 'keyword' },

            // sendgrid specific
            subject: { type: 'keyword' },
            html: { type: 'keyword' },
            templateId: { type: 'keyword' },
            dynamic_template_data: {
              dynamic: 'false',
              properties: {}
            },

            // twilio specific
            body: { type: 'keyword' },
          }
        }
      }
    };

    this.clients = new MessengerClients();
  }

  get sdk () {
    return this.context.accessors.sdk;
  }

  /**
   * Init the plugin
   */
  async init (config: JSONObject, context: PluginContext) {
    this.config = _.merge(this.defaultConfig, config);

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

    if (this.config.mockMessages) {
      await this.createMockedMessagesCollection();
    }
  }

  private async createMockedMessagesCollection () {
    const mutex = new Mutex('hermes-messenger/init-mock-database');

    await mutex.lock();

    try {
      if (! await this.sdk.index.exists(this.config.adminIndex)) {
        // Possible race condition because of index cache propagation.
        // The index has been created but the node didn't receive the index
        // cache update message yet, causing index:exists to returns false
        try {
          await this.sdk.index.create(this.config.adminIndex);
        }
        catch (error) {
          if (error.id !== 'services.storage.index_already_exists') {
            throw error;
          }
        }
      }

      await this.sdk.collection.create(this.config.adminIndex, 'messages', {
        mappings: this.config.collections.messages,
      });
    }
    finally {
      await mutex.unlock();
    }

  }
}
