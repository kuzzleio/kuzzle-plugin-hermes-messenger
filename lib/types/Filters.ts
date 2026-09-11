import { RecipientTypeFilter } from "../recipients/RecipientType";

/**
 * Criteria accepted by `ProviderManager.listProviders`.
 *
 * A provider matches `audience` when at least one of its accepted recipient
 * types belongs to that audience, and `capability` when it has **every**
 * requested capability.
 */
export interface ProviderFilters extends RecipientTypeFilter {
  /**
   * Capability, or capabilities, every returned provider must have (e.g.
   * `"file"` or `["html", "file"]`). An empty array is the same as no filter.
   */
  capability?: string | string[];
}

/**
 * Criteria accepted by `ProviderManager.listAccounts`.
 *
 * An account matches `audience` and `capability` when its provider does.
 */
export interface AccountFilters extends RecipientTypeFilter {
  /** Identifier of the provider owning the accounts. */
  providerId?: string;
  /** Capability, or capabilities, the owning provider must have. */
  capability?: string | string[];
}
