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
              path: `hermes/provider/:provider/account/:account`,
            },
          ],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [{ verb: "post", path: `hermes/provider/:provider/accounts` }],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [
            {
              verb: "delete",
              path: `hermes/provider/:provider/account/:account`,
            },
          ],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: "get", path: `hermes/providers/:provider/accounts` }],
        },
      },
    };
  }

  async send(request: KuzzleRequest): Promise<void> {
    const provider = request.getString("provider");

    const account = request.getString("account");
    const to = request.getArray("to");

    const params = request.getObject("params");

    this.providerManager
      .get(provider)
      .send(account, to, ...Object.values(params));
  }

  async addAccount(request: KuzzleRequest): Promise<void> {
    const provider = request.getString("provider");
    const params = request.getObject("params");

    this.providerManager
      .get(provider)
      .addAccount(provider, ...Object.values(params));
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
}
