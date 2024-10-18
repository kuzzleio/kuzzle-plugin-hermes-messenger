import {
  ControllerDefinition,
  EmbeddedSDK,
  JSONObject,
  KuzzleRequest,
  PluginContext,
} from "kuzzle";

import { SMTPClient } from "../messenger-clients";
import TaskQueue from "../helper/TaskQueue";

export class SMTPController {
  private context: PluginContext;
  private config: JSONObject;
  private queue: TaskQueue;
  private smtpClient: SMTPClient;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    smtpClient: SMTPClient
  ) {
    this.config = config;
    this.context = context;
    this.smtpClient = smtpClient;
    this.queue = new TaskQueue();

    this.definition = {
      actions: {
        sendEmail: {
          handler: this.sendEmail.bind(this),
          http: [{ verb: "post", path: "hermes/smtp/email" }],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: "post", path: "hermes/smtp/accounts" }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [{ verb: "delete", path: "hermes/smtp/account/:account" }],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: "get", path: "hermes/smtp/accounts" }],
        },
      },
    };
  }

  async sendEmail(request: KuzzleRequest) {
    const account = request.getString("account");
    const to = request.getBodyArray("to");
    const subject = request.getBodyString("subject");
    const html = request.getBodyString("html");
    const fromEmail = request.getBodyString("from", "");
    const attachmentsEmail = request.getBodyArray("attachments", []);

    const from = fromEmail.length === 0 ? null : fromEmail;
    const attachments = attachmentsEmail.length === 0 ? null : attachmentsEmail;

    this.queue.add(() =>
      this.smtpClient.sendEmail(account, to, subject, html, {
        attachments,
        from,
      })
    );
  }

  async addAccount(request: KuzzleRequest) {
    const account = request.getString("account");
    const host = request.getBodyString("host");
    const port = request.getBodyNumber("port");
    const user = request.getBodyString("user");
    const pass = request.getBodyString("pass");
    const defaultSender = request.getBodyString("defaultSender");

    this.smtpClient.addAccount(account, host, port, user, pass, defaultSender);
  }

  async removeAccount(request: KuzzleRequest) {
    const account = request.getString("account");

    this.smtpClient.removeAccount(account);
  }

  async listAccounts() {
    const accounts = this.smtpClient.listAccounts();

    return { accounts };
  }
}
