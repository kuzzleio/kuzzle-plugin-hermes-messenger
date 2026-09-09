import { JSONObject, NotFoundError, PluginContext } from "kuzzle";
import { BaseProvider } from "./BaseProvider";
import { matches } from "lodash";
import { AccountFilters, ProviderFilters, SerializedAccount } from "../types";
import { getFilteredAudiences } from "../recipients";

export class ProviderManager {
  readonly providers = new Map<string, BaseProvider<any>>();

  async init(config: JSONObject, context: PluginContext): Promise<void> {
    for (const [, value] of this.providers) {
      await value.init(config, context);
    }
  }

  set(providerName: string, providerInstance: BaseProvider<any>) {
    this.providers.set(providerName, providerInstance);
  }

  has(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  get(providerName: string): BaseProvider<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new NotFoundError(
        `${providerName} provider is not available yet. Are you trying to access it before the application has started ?`,
      );
    }

    return provider;
  }

  /**
   * List registered providers.
   *
   * @param filters.capabilities Only providers whose capabilities match every
   *   given key are returned.
   * @param filters.audience Only providers accepting at least one recipient
   *   type of this audience (or of one of these audiences) are returned.
   */
  listProviders(filters: ProviderFilters = {}): BaseProvider<any>[] {
    let providers = Array.from(this.providers.values());

    const { capabilities, ...recipientTypeFilter } = filters;

    if (capabilities && Object.keys(capabilities).length > 0) {
      const filterMatcher = matches(capabilities);
      providers = providers.filter((p) => filterMatcher(p.capabilities));
    }

    if (getFilteredAudiences(recipientTypeFilter).length > 0) {
      providers = providers.filter((p) =>
        p.acceptsRecipientTypes(recipientTypeFilter),
      );
    }

    return providers;
  }

  /**
   * List registered accounts.
   *
   * Each entry carries the route key of its provider so that the result can
   * be used directly as the `provider` / `account` arguments of `sendMessage`,
   * plus the recipient types and audiences of its provider so that clients
   * can filter accounts without a second request.
   *
   * @param filters.provider When given, only the accounts of this provider are
   *   returned. Throws if the provider is not registered.
   * @param filters.audience When given, only the accounts of providers
   *   accepting at least one recipient type of this audience (or of one of
   *   these audiences) are returned.
   */
  listAccounts(filters: AccountFilters = {}): SerializedAccount[] {
    const { provider: providerName, ...recipientTypeFilter } = filters;

    const providers: Array<[string, BaseProvider<any>]> =
      providerName === undefined
        ? Array.from(this.providers.entries())
        : [[providerName, this.get(providerName)]];

    const accounts: SerializedAccount[] = [];

    for (const [name, provider] of providers) {
      if (!provider.acceptsRecipientTypes(recipientTypeFilter)) {
        continue;
      }

      const acceptedRecipientTypes = provider.getAcceptedRecipientTypes();
      const audiences = provider.getAudiences();

      for (const accountName of provider.listAccounts()) {
        accounts.push({
          name: accountName,
          provider: name,
          acceptedRecipientTypes,
          audiences,
        });
      }
    }

    return accounts;
  }
}
