import {
  BadRequestError,
  JSONObject,
  KuzzleError,
  Mutex,
  Plugin,
  PluginContext,
} from "kuzzle";
import merge from "lodash/merge";

import { ProviderController } from "./controllers";
import {
  BaseProvider,
  ProviderManager,
  SendgridProvider,
  SMSEnvoiProvider,
  SmtpProvider,
  TwilioProvider,
} from "./providers";
import {
  emailRecipient,
  phoneRecipient,
  RecipientTypeDefinition,
  RecipientTypeRegistry,
} from "./recipients";
export class HermesMessengerPlugin extends Plugin {
  readonly defaultConfig: JSONObject;
  readonly controller: ProviderController;
  readonly providerManager: ProviderManager;
  readonly recipientTypeRegistry: RecipientTypeRegistry =
    new RecipientTypeRegistry();
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

    this.registerRecipientType(emailRecipient);

    this.registerRecipientType(phoneRecipient);

    this.registerProvider("smtp", new SmtpProvider(this.recipientTypeRegistry));
    this.registerProvider(
      "twilio",
      new TwilioProvider(this.recipientTypeRegistry),
    );
    this.registerProvider(
      "sendgrid",
      new SendgridProvider(this.recipientTypeRegistry),
    );
    this.registerProvider(
      "smsenvoi",
      new SMSEnvoiProvider(this.recipientTypeRegistry),
    );

    this.controller = new ProviderController(
      this.config,
      this.context,
      this.providerManager,
      this.recipientTypeRegistry,
    );
  }

  get sdk() {
    return this.context.accessors.sdk;
  }

  /**
   * Init the plugin
   */
  async init(config: JSONObject, context: PluginContext) {
    this.config = merge(this.defaultConfig, config);

    this.context = context;

    await this.providerManager.init(this.config, this.context);

    this.api = {
      hermes: this.controller.definition,
    };

    await this.initDatabase();
    await this.initConfig();
  }

  registerProvider(name: string, provider: BaseProvider<any>) {
    for (const recipientTypeName of provider.getAcceptedRecipientTypes()) {
      if (!this.recipientTypeRegistry.has(recipientTypeName)) {
        throw new BadRequestError(
          `Provider "${name}" references unknown recipient type "${recipientTypeName}" — register it via registerRecipientType() before registering this provider.`,
        );
      }
    }

    this.providerManager.set(name, provider);
  }

  hasProvider(name: string): boolean {
    return this.providerManager.has(name);
  }

  getProvider(name: string) {
    return this.providerManager.get(name);
  }

  registerRecipientType(definition: RecipientTypeDefinition): void {
    this.recipientTypeRegistry.register(definition);
  }

  hasRecipientType(name: string): boolean {
    return this.recipientTypeRegistry.has(name);
  }

  getRecipientType(name: string): RecipientTypeDefinition {
    return this.recipientTypeRegistry.get(name);
  }

  listRecipientTypes(): RecipientTypeDefinition[] {
    return this.recipientTypeRegistry.list();
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
          if (
            (error as KuzzleError).id !==
            "services.storage.index_already_exists"
          ) {
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
