import {
  KuzzleRequest,
  EmbeddedSDK,
  JSONObject,
  PluginContext,
  ControllerDefinition,
  BadRequestError,
} from "kuzzle";
import { RecipientTypeRegistry } from "../recipients";
import { ProviderManager } from "../providers";

export class ProviderController {
  protected context: PluginContext;
  readonly config: JSONObject;

  readonly providerManager: ProviderManager;
  readonly recipientTypeRegistry: RecipientTypeRegistry;

  definition: ControllerDefinition;

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor(
    config: JSONObject,
    context: PluginContext,
    providerManager: ProviderManager,
    recipientTypeRegistry: RecipientTypeRegistry,
  ) {
    this.config = config;
    this.context = context;
    this.providerManager = providerManager;
    this.recipientTypeRegistry = recipientTypeRegistry;

    this.definition = {
      actions: {
        sendMessage: {
          handler: this.sendMessage.bind(this),
          http: [
            {
              verb: "post",
              path: `hermes/providers/:provider/accounts/:name`,
            },
          ],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [
            {
              verb: "put",
              path: `hermes/providers/:provider/accounts/:name`,
            },
          ],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [
            {
              verb: "delete",
              path: `hermes/providers/:provider/accounts/:name`,
            },
          ],
        },
        listAccounts: {
          handler: this.listAccounts.bind(this),
          http: [{ verb: "get", path: `hermes/accounts` }],
        },
        listProviders: {
          handler: this.listProviders.bind(this),
          http: [{ verb: "get", path: `hermes/providers` }],
        },
        listRecipientTypes: {
          handler: this.listRecipientTypes.bind(this),
          http: [{ verb: "get", path: `hermes/recipient-types` }],
        },
      },
    };
  }

  /**
   * Send a message through an account. Arguments: `provider` (route key) and
   * `name` (account name). Body: `recipients`, `content`, optional `params`.
   */
  async sendMessage(request: KuzzleRequest): Promise<void> {
    const providerName = request.getString("provider");
    const name = request.getString("name");

    const recipients = request.getBodyArray("recipients");
    const content = request.getBodyObject("content");
    const params = request.getBodyObject("params", {});

    const provider = this.providerManager.get(providerName);
    provider.validateRecipients(recipients);
    provider.validateMessageContent(content);
    provider.validateMessageAdditionalParams(params);

    await provider.sendMessage(name, recipients, content, params);
  }

  /**
   * Register an account. Arguments: `provider` (route key) and `name` (the
   * name to register the account under). Body: `params`, validated against the
   * provider's `accountParamsSchema` by `BaseProvider.addAccount()`.
   */
  async addAccount(request: KuzzleRequest): Promise<void> {
    const provider = request.getString("provider");
    const name = request.getString("name");
    const params = request.getBodyObject("params");

    this.providerManager.get(provider).addAccount(name, params);
  }

  /** Remove an account. Arguments: `provider` (route key) and `name`. */
  async removeAccount(request: KuzzleRequest): Promise<void> {
    const provider = request.getString("provider");
    const name = request.getString("name");

    this.providerManager.get(provider).removeAccount(name);
  }

  async listAccounts(request: KuzzleRequest) {
    const accounts = this.providerManager.listAccounts({
      provider: this.getOptionalString(request, "provider"),
      capability: this.getOptionalStringList(request, "capability"),
      audience: this.getOptionalStringList(request, "audience"),
    });

    return { accounts };
  }

  async listProviders(request: KuzzleRequest) {
    const providers = this.providerManager.listProviders({
      capability: this.getOptionalStringList(request, "capability"),
      audience: this.getOptionalStringList(request, "audience"),
    });

    return providers.map((provider) => provider.serialize());
  }

  async listRecipientTypes(request: KuzzleRequest) {
    return this.recipientTypeRegistry.list({
      audience: this.getOptionalStringList(request, "audience"),
    });
  }

  /**
   * Read an optional string argument.
   *
   * Kuzzle treats an `undefined` default as "no default" and throws, so the
   * presence of the argument has to be checked by hand.
   */
  private getOptionalString(
    request: KuzzleRequest,
    name: string,
  ): string | undefined {
    return request.input.args[name] === undefined
      ? undefined
      : request.getString(name);
  }

  /**
   * Read an optional list argument (`audience`, `capability`).
   *
   * Accepts a string (`"human"`), a comma separated list (`"human,technical"`,
   * handy in HTTP query strings) or an array of strings.
   */
  private getOptionalStringList(
    request: KuzzleRequest,
    name: string,
  ): string[] | undefined {
    const value = request.input.args[name];

    if (value === undefined || value === null) {
      return undefined;
    }

    const values: unknown[] =
      typeof value === "string" ? value.split(",") : value;

    if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
      throw new BadRequestError(
        `Wrong type for argument "${name}" (expected: string or array of strings)`,
      );
    }

    return (values as string[])
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
}
