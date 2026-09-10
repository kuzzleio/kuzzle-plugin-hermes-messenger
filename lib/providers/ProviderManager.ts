import { JSONObject, NotFoundError, PluginContext } from "kuzzle";
import { BaseProvider } from "./BaseProvider";
import { AccountFilters, ProviderFilters, SerializedAccount } from "../types";
import { getFilteredAudiences } from "../recipients";

/** Normalize an optional string-or-array criterion to an array. */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export class ProviderManager {
  readonly providers = new Map<string, BaseProvider<any>>();

  async init(config: JSONObject, context: PluginContext): Promise<void> {
    for (const [, value] of this.providers) {
      await value.init(config, context);
    }
  }

  /** Register a provider under its identifier (route key). */
  set(providerId: string, providerInstance: BaseProvider<any>) {
    providerInstance.setProviderId(providerId);
    this.providers.set(providerId, providerInstance);
  }

  has(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  get(providerId: string): BaseProvider<any> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new NotFoundError(
        `${providerId} provider is not available yet. Are you trying to access it before the application has started ?`,
      );
    }

    return provider;
  }

  /**
   * List registered providers.
   *
   * @param filters.capability Only providers having every given capability
   *   are returned.
   * @param filters.audience Only providers accepting at least one recipient
   *   type of this audience (or of one of these audiences) are returned.
   */
  listProviders(filters: ProviderFilters = {}): BaseProvider<any>[] {
    let providers = Array.from(this.providers.values());

    const { capability, ...recipientTypeFilter } = filters;
    const capabilities = toList(capability);

    if (capabilities.length > 0) {
      providers = providers.filter((p) => p.hasCapabilities(capabilities));
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
   * Each entry carries the id of its provider so that the result can be used
   * directly as the `providerId` / `accountId` arguments of `sendMessage`,
   * plus the recipient types, audiences and capabilities of its provider so
   * that clients can filter accounts without a second request.
   *
   * @param filters.providerId When given, only the accounts of this provider
   *   are returned. Throws if the provider is not registered.
   * @param filters.capability When given, only the accounts of providers
   *   having every given capability are returned.
   * @param filters.audience When given, only the accounts of providers
   *   accepting at least one recipient type of this audience (or of one of
   *   these audiences) are returned.
   */
  listAccounts(filters: AccountFilters = {}): SerializedAccount[] {
    const { providerId, capability, ...recipientTypeFilter } = filters;
    const capabilities = toList(capability);

    const providers: Array<[string, BaseProvider<any>]> =
      providerId === undefined
        ? Array.from(this.providers.entries())
        : [[providerId, this.get(providerId)]];

    const accounts: SerializedAccount[] = [];

    for (const [name, provider] of providers) {
      if (
        !provider.acceptsRecipientTypes(recipientTypeFilter) ||
        !provider.hasCapabilities(capabilities)
      ) {
        continue;
      }

      const acceptedRecipientTypes = provider.getAcceptedRecipientTypes();
      const audiences = provider.getAudiences();
      const providerCapabilities = provider.capabilities;

      for (const accountId of provider.listAccounts()) {
        accounts.push({
          accountId,
          displayName: provider.getAccount(accountId).displayName ?? accountId,
          providerId: name,
          acceptedRecipientTypes,
          capabilities: providerCapabilities,
          audiences,
        });
      }
    }

    return accounts;
  }
}
