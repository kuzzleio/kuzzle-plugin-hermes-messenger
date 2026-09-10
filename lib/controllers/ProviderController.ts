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
              path: `hermes/providers/:providerId/accounts/:accountId`,
            },
          ],
        },
        addAccount: {
          handler: this.addAccount.bind(this),
          http: [
            {
              verb: "put",
              path: `hermes/providers/:providerId/accounts/:accountId`,
            },
          ],
        },
        removeAccount: {
          handler: this.removeAccount.bind(this),
          http: [
            {
              verb: "delete",
              path: `hermes/providers/:providerId/accounts/:accountId`,
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
   * Send a message through an account. Arguments: `providerId` and
   * `accountId`. Body: `recipients`, `content`, optional `params`.
   */
  async sendMessage(request: KuzzleRequest): Promise<void> {
    const providerId = request.getString("providerId");
    const accountId = request.getString("accountId");

    const recipients = request.getBodyArray("recipients");
    const content = request.getBodyObject("content");
    const params = request.getBodyObject("params", {});

    const provider = this.providerManager.get(providerId);
    provider.validateRecipients(recipients);
    provider.validateMessageContent(content);
    provider.validateMessageAdditionalParams(params);

    await provider.sendMessage(accountId, recipients, content, params);
  }

  /**
   * Register an account. Arguments: `providerId` and `accountId` (the
   * identifier to register the account under). Body: `params`, validated
   * against the provider's `accountParamsSchema` by `BaseProvider.addAccount()`,
   * and an optional `displayName`.
   */
  async addAccount(request: KuzzleRequest): Promise<void> {
    const providerId = request.getString("providerId");
    const accountId = request.getString("accountId");
    const params = request.getBodyObject("params");
    const displayName =
      request.input.body?.displayName === undefined
        ? undefined
        : request.getBodyString("displayName");

    this.providerManager
      .get(providerId)
      .addAccount(accountId, params, displayName);
  }

  /** Remove an account. Arguments: `providerId` and `accountId`. */
  async removeAccount(request: KuzzleRequest): Promise<void> {
    const providerId = request.getString("providerId");
    const accountId = request.getString("accountId");

    this.providerManager.get(providerId).removeAccount(accountId);
  }

  async listAccounts(request: KuzzleRequest) {
    const accounts = this.providerManager.listAccounts({
      providerId: this.getOptionalString(request, "providerId"),
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
