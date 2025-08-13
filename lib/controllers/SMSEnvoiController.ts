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
    const fromNumber = request.getBodyString("from", "");
    const to = request.getBodyString("to");
    const text = request.getBodyString("text");

    const from = fromNumber.length === 0 ? null : fromNumber;

    await this.smsClient.sendSms(account, to, text, { from });
  }

  async addAccount(request: KuzzleRequest) {
    const account = request.getString("account");
    const userKey = request.getBodyString("userKey");
    const accessToken = request.getBodyString("accessToken");
    const defaultSender = request.getBodyString("defaultSender");

    this.smsClient.addAccount(account, userKey, accessToken, defaultSender);
  }

  async removeAccount(request: KuzzleRequest) {
    const account = request.getString("account");
    this.smsClient.removeAccount(account);
  }

  async listAccounts() {
    return { accounts: this.smsClient.listAccounts() };
  }
}
