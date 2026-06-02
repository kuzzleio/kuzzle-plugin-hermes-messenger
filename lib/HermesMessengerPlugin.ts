import {
  InternalError,
  JSONObject,
  Mutex,
  Plugin,
  PluginContext,
} from "kuzzle";
import _ from "lodash";

import { ProviderController } from "./controllers";
import {
  BaseProvider,
  SendgridProvider,
  SMSEnvoiProvider,
  SmtpProvider,
  TwilioProvider,
} from "./providers";

export class ProviderManager {
  private providers = new Map<string, BaseProvider<any>>();

  constructor() {}

  async init(config: JSONObject, context: PluginContext): Promise<void> {
    for (const [, value] of this.providers) {
      await value.init(config, context);
    }
  }

  set(providerName: string, providerInstance: BaseProvider<any>) {
    this.providers.set(providerName, providerInstance);
  }

  has(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  get(providerName: string): BaseProvider<any> {
    if (!this.providers.has(providerName)) {
      throw new InternalError(
        `${providerName} provider is not available yet. Are you trying to access it before the application has started ?`,
      );
    }

    return this.providers.get(providerName);
  }

  listProviders(): BaseProvider<any>[] {
    return Array.from(this.providers.values());
  }
}

export class HermesMessengerPlugin extends Plugin {
  private defaultConfig: JSONObject;
  private controller: ProviderController;
  private providerManager: ProviderManager;

  constructor() {
    super({
      kuzzleVersion: ">=2.12.0 <3",
    });

    this.defaultConfig = {
      adminIndex: "hermes-messenger",
      configDocumentId: "plugin--hermes-messenger",
      collections: {
        config: {
          dynamic: "strict",
          properties: {
            type: { type: "keyword" },

            "hermes-messenger": {
              properties: {},
            },
          },
        },
      },
    };

    this.providerManager = new ProviderManager();
    this.providerManager.set("smtp", new SmtpProvider());
    this.providerManager.set("twilio", new TwilioProvider());
    this.providerManager.set("sendgrid", new SendgridProvider());
    this.providerManager.set("smsenvoi", new SMSEnvoiProvider());

    this.controller = new ProviderController(
      this.config,
      this.context,
      this.providerManager,
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

    await this.providerManager.init(this.config, this.context);

    this.api = {
      hermes: this.controller.definition,
    };

    await this.initDatabase();
    await this.initConfig();
  }

  registerProvider(name: string, provider: BaseProvider<any>) {
    this.providerManager.set(name, provider);
  }

  hasProvider(name: string): boolean {
    return this.providerManager.has(name);
  }

  getProvider(name: string) {
    return this.providerManager.get(name);
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

          "hermes-messenger": {},
        },
        this.config.configDocumentId,
      );
    }
  }
}
