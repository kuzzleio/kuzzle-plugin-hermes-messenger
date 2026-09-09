import { ProviderCapabilities } from "./ProviderCapabilities";
import { RecipientTypeFilter } from "../recipients/RecipientType";

/**
 * Criteria accepted by `ProviderManager.listProviders`.
 *
 * A provider matches `audience` when at least one of its accepted recipient
 * types belongs to that audience.
 */
export interface ProviderFilters extends RecipientTypeFilter {
  /** Partial capabilities every returned provider must have. */
  capabilities?: Partial<ProviderCapabilities>;
}

/**
 * Criteria accepted by `ProviderManager.listAccounts`.
 *
 * An account matches `audience` when its provider does.
 */
export interface AccountFilters extends RecipientTypeFilter {
  /** Route key of the provider owning the accounts. */
  provider?: string;
}
