import {
  InternalError,
  JSONObject,
  Mutex,
  Plugin,
  PluginContext,
} from "kuzzle";
import _ from "lodash";

import { ProviderController } from "./controllers";
import { BaseMessengerClient } from "./providers";

export class MessengerClients {
  private clients = new Map<string, BaseMessengerClient<any>>();

  constructor() {}

  async init(config: JSONObject, context: PluginContext): Promise<void> {
    for (const [, value] of this.clients) {
      await value.init(config, context);
    }
  }

  set(clientName: string, clientInstance: BaseMessengerClient<any>) {
    this.clients.set(clientName, clientInstance);
  }

  get(clientName: string): BaseMessengerClient<any> {
    if (!this.clients.has(clientName)) {
      throw new InternalError(
        `${clientName} client is not available yet. Are you trying to access it before the application has started?`,
      );
    }

    return this.clients.get(clientName);
  }
}

export class HermesMessengerPlugin extends Plugin {
  private defaultConfig: JSONObject;
  private controller: ProviderController;
  clients: MessengerClients;

  constructor() {
    super({
      kuzzleVersion: ">=2.12.0 <3",
    });

    this.defaultConfig = {
      adminIndex: "hermes-messenger",
      configDocumentId: "plugin--hermes-messenger",
      collections: {
        // config collection
        config: {
          dynamic: "strict",
          properties: {
            type: { type: "keyword" },

            "hermes-messenger": {
              properties: {
                // allows to mock messages for specific accounts
                mockedAccounts: {
                  dynamic: "false",
                  properties: {
                    // example to mock sendgrid accounts
                    // sengrid: ['commons', 'client-1']
                  },
                },
              },
            },
          },
        },
        // collection for mocked messages
        messages: {
          dynamic: "strict",
          properties: {
            account: { type: "keyword" },
            from: { type: "keyword" },
            to: { type: "keyword" },
            subject: { type: "keyword" },
            html: { type: "keyword" },
            attachments: {
              dynamic: "strict",
              properties: {
                content: { type: "keyword" },
                contentType: { type: "keyword" },
                type: { type: "keyword" },
                filename: { type: "keyword" },
                contentDisposition: { type: "keyword" },
                disposition: { type: "keyword" },
                cid: { type: "keyword" },
                content_id: { type: "keyword" },
              },
            },

            // sendgrid specific
            templateId: { type: "keyword" },
            dynamic_template_data: {
              dynamic: "false",
              properties: {},
            },

            // twilio specific
            body: { type: "keyword" },
          },
        },
      },
    };

    this.clients = new MessengerClients();

    this.controller = new ProviderController(
      this.config,
      this.context,
      this.clients,
    );
  }

  get sdk() {
    return this.context.accessors.sdk;
  }

  /**
   * Init the plugin
   */
  async init(config: JSONObject, context: PluginContext) {
    this.config = _.merge(this.defaultConfig, config);

    this.context = context;

    await this.clients.init(this.config, this.context);

    this.api = {};

    await this.initDatabase();
    await this.initConfig();
  }

  private async initDatabase() {
    const mutex = new Mutex("hermes-messenger/init-mock-database");

    await mutex.lock();

    try {
      if (!(await this.sdk.index.exists(this.config.adminIndex))) {
        // Possible race condition because of index cache propagation.
        // The index has been created but the node didn't receive the index
        // cache update message yet, causing index:exists to returns false
        try {
          await this.sdk.index.create(this.config.adminIndex);
        } catch (error) {
          if (error.id !== "services.storage.index_already_exists") {
            throw error;
          }
        }
      }

      await Promise.all([
        this.sdk.collection.create(this.config.adminIndex, "messages", {
          mappings: this.config.collections.messages,
        }),
        this.sdk.collection.create(this.config.adminIndex, "config", {
          mappings: this.config.collections.config,
        }),
      ]);
    } finally {
      await mutex.unlock();
    }
  }

  /**
   * Initialize the config document if it does not exists
   */
  private async initConfig() {
    const exists = await this.sdk.document.exists(
      this.config.adminIndex,
      "config",
      this.config.configDocumentId,
    );

    if (!exists) {
      await this.sdk.document.create(
        this.config.adminIndex,
        "config",
        {
          type: "hermes-messenger",

          "hermes-messenger": {
            mockedAccounts: [],
          },
        },
        this.config.configDocumentId,
      );
    }
  }
}
