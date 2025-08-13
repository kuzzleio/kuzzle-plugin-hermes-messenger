import {
  InternalError,
  JSONObject,
  Mutex,
  Plugin,
  PluginContext,
} from "kuzzle";
import _ from "lodash";

import {
  SMTPController,
  SendgridController,
  TwilioController,
  SMSEnvoiController,
} from "./controllers";
import {
  MessengerClient,
  SMTPClient,
  SendgridClient,
  TwilioClient,
  SMSEnvoiClient,
} from "./messenger-clients";

export class MessengerClients {
  private clients = new Map<string, MessengerClient<any>>();

  /**
   * Returns the Twilio client.
   */
  get twilio(): TwilioClient {
    if (!this.clients.has("twilio")) {
      throw new InternalError(
        "Twilio client is not available yet. Are you trying to access it before the application has started?",
      );
    }

    return this.clients.get("twilio") as TwilioClient;
  }

  /**
   * Returns the SmsEnvoi client.
   */
  get smsenvoi(): SMSEnvoiClient {
    if (!this.clients.has("smsenvoi")) {
      throw new InternalError(
        "SmsEnvoi client is not available yet. Are you trying to access it before the application has started?",
      );
    }

    return this.clients.get("smsenvoi") as SMSEnvoiClient;
  }

  /**
   * Returns the Sendgrid client.
   */
  get sendgrid(): SendgridClient {
    if (!this.clients.has("sendgrid")) {
      throw new InternalError(
        "Sendgrid client is not available yet. Are you trying to access it before the application has started?",
      );
    }

    return this.clients.get("sendgrid") as SendgridClient;
  }

  /**
   * Returns the SMTP client.
   */
  get smtp(): SMTPClient {
    if (!this.clients.has("smtp")) {
      throw new InternalError(
        "SMTP client is not available yet. Are you trying to access it before the application has started?",
      );
    }

    return this.clients.get("smtp") as SMTPClient;
  }

  constructor() {
    this.clients.set("twilio", new TwilioClient());
    this.clients.set("smsenvoi", new SMSEnvoiClient());
    this.clients.set("sendgrid", new SendgridClient());
    this.clients.set("smtp", new SMTPClient());
  }

  async init(config: JSONObject, context: PluginContext) {
    await this.twilio.init(config, context);
    await this.smsenvoi.init(config, context);
    await this.sendgrid.init(config, context);
    await this.smtp.init(config, context);
  }
}

export class HermesMessengerPlugin extends Plugin {
  private defaultConfig: JSONObject;
  private smsenvoiController: SMSEnvoiController;
  private twilioController: TwilioController;
  private sendgridController: SendgridController;
  private smtpController: SMTPController;

  /**
   * Instantiated messenger clients
   */
  clients: MessengerClients;

  /**
   * Constructor
   */
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

    this.twilioController = new TwilioController(
      this.config,
      this.context,
      this.clients.twilio,
    );
    this.sendgridController = new SendgridController(
      this.config,
      this.context,
      this.clients.sendgrid,
    );
    this.smtpController = new SMTPController(
      this.config,
      this.context,
      this.clients.smtp,
    );

    this.smsenvoiController = new SMSEnvoiController(
      this.config,
      this.context,
      this.clients.smsenvoi,
    );

    this.api = {
      "hermes/twilio": this.twilioController.definition,

      "hermes/sendgrid": this.sendgridController.definition,

      "hermes/smtp": this.smtpController.definition,

      "hermes/smsenvoi": this.smsenvoiController.definition,
    };

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
