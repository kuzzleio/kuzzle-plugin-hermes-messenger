import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  ControllerDefinition,
} from "kuzzle";
import { ProviderManager } from "lib/HermesMessengerPlugin";

export class ProviderController {
  protected context: PluginContext;
  private config: JSONObject;

  private providerManager: ProviderManager;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    providerManager: ProviderManager,
  ) {
    this.config = config;
    this.context = context;
    this.providerManager = providerManager;

    this.definition = {
      actions: {
        send: {
          handler: this.send.bind(this),
          http: [
            {
              verb: "post",
              path: `hermes/providers/:provider/accounts/:account`,
            },
          ],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: "post", path: `hermes/providers/:provider/accounts` }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [
            {
              verb: "delete",
              path: `hermes/providers/:provider/accounts/:account`,
            },
          ],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: "get", path: `hermes/providers/:provider/accounts` }],
        },
        listProviders: {
          handler: this.listProviders.bind(this),
          http: [{ verb: "get", path: `hermes/providers` }],
        },
      },
    };
  }

  async send(request: KuzzleRequest): Promise<void> {
    const account = request.getString("account");
    const providerName = request.getString("provider");

    const recipients = request.getBodyArray("recipients");
    const content = request.getBodyObject("content");
    const params = request.getBodyObject("params");

    const provider = this.providerManager.get(providerName);
    provider.validateSendParams(params);
    await provider.send(account, recipients, content, params);
  }

  async addAccount(request: KuzzleRequest): Promise<void> {
    const provider = request.getString("provider");
    const params = request.getObject("params");

    this.providerManager.get(provider).addAccount(provider, params);
  }

  async removeAccount(request: KuzzleRequest) {
    const provider = request.getString("provider");
    const account = request.getString("account");

    this.providerManager.get(provider).removeAccount(account);
  }

  async listAccounts(request: KuzzleRequest) {
    const provider = request.getString("provider");

    const accounts = this.providerManager.get(provider).listAccounts();

    return { accounts };
  }

  async listProviders(request: KuzzleRequest) {
    const filters = request.getBodyObject("filters", {});
    return this.providerManager.listProviders(filters);
  }
}
