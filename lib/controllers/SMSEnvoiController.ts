import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  ControllerDefinition,
} from "kuzzle";

import { SMSEnvoiClient } from "../messenger-clients";

export class SMSEnvoiController {
  private context: PluginContext;
  private config: JSONObject;
  private smsClient: SMSEnvoiClient;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    smsClient: SMSEnvoiClient,
  ) {
    this.config = config;
    this.context = context;
    this.smsClient = smsClient;

    this.definition = {
      actions: {
        sendSms: {
          handler: this.sendSms.bind(this),
          http: [{ verb: "post", path: "hermes/smsenvoi/sms" }],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: "post", path: "hermes/smsenvoi/accounts" }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [{ verb: "delete", path: "hermes/smsenvoi/account/:account" }],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: "get", path: "hermes/smsenvoi/accounts" }],
        },
      },
    };
  }

  async sendSms(request: KuzzleRequest) {
    const account = request.getString("account");
    const message = request.getBodyString("text");
    const recipientsStr = request.getBodyString("recipients");
    const recipients = recipientsStr.split(",").map((r) => r.trim());

    await this.smsClient.sendSms(account, recipients, message);
  }

  async addAccount(request: KuzzleRequest) {
    const account = request.getString("account");
    const userKey = request.getBodyString("userKey");
    const accessToken = request.getBodyString("accessToken");

    this.smsClient.addAccount(account, userKey, accessToken);
  }

  async removeAccount(request: KuzzleRequest) {
    const account = request.getString("account");
    this.smsClient.removeAccount(account);
  }

  async listAccounts() {
    return { accounts: this.smsClient.listAccounts() };
  }
}
