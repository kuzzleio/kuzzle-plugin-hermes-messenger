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

  async sendMessage(request: KuzzleRequest): Promise<void> {
    const account = request.getString("account");
    const providerName = request.getString("provider");

    const recipients = request.getBodyArray("recipients");
    const content = request.getBodyObject("content");
    const params = request.getBodyObject("params", {});

    const provider = this.providerManager.get(providerName);
    provider.validateRecipients(recipients);
    provider.validateMessageContent(content);
    provider.validateMessageAdditionalParams(params);

    await provider.sendMessage(account, recipients, content, params);
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
    const accounts = this.providerManager.listAccounts({
      provider: this.getOptionalString(request, "provider"),
      audience: this.getOptionalAudiences(request),
    });

    return { accounts };
  }

  async listProviders(request: KuzzleRequest) {
    const providers = this.providerManager.listProviders({
      capabilities: request.getBodyObject("filters", {}),
      audience: this.getOptionalAudiences(request),
    });

    return providers.map((provider) => provider.serialize());
  }

  async listRecipientTypes(request: KuzzleRequest) {
    return this.recipientTypeRegistry.list({
      audience: this.getOptionalAudiences(request),
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
   * Read the optional `audience` argument.
   *
   * Accepts a string (`"human"`), a comma separated list (`"human,technical"`,
   * handy in HTTP query strings) or an array of strings.
   */
  private getOptionalAudiences(request: KuzzleRequest): string[] | undefined {
    const value = request.input.args.audience;

    if (value === undefined || value === null) {
      return undefined;
    }

    const audiences: unknown[] =
      typeof value === "string" ? value.split(",") : value;

    if (
      !Array.isArray(audiences) ||
      audiences.some((a) => typeof a !== "string")
    ) {
      throw new BadRequestError(
        'Wrong type for argument "audience" (expected: string or array of strings)',
      );
    }

    return (audiences as string[])
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
  }
}
