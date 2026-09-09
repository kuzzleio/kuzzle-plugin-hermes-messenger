import { JSONObject } from "kuzzle";

/**
 * Public representation of a registered account, as returned by
 * `hermes:listAccounts`.
 */
export interface SerializedAccount {
  /** Account name, unique within its provider */
  name: string;
  /** Route key of the provider owning the account (e.g. `smtp`, `twilio`) */
  provider: string;
  /**
   * Audiences the account can address: those of its provider, i.e. the union
   * of the `audiences` of the provider's accepted recipient types.
   */
  audiences: string[];
  /** Public options of the account (never credentials) */
  options: JSONObject;
}
