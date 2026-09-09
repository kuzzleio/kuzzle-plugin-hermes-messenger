/**
 * Public representation of a registered account, as returned by
 * `hermes:listAccounts`.
 *
 * Besides its name, an account carries what a client needs to pick it
 * without a second request: the recipient types its provider accepts, the
 * audiences it can address and the capabilities of its provider.
 */
export interface SerializedAccount {
  /** Account name, unique within its provider */
  name: string;
  /** Route key of the provider owning the account (e.g. `smtp`, `twilio`) */
  provider: string;
  /** Names of the recipient types accepted by the provider, see `hermes:listRecipientTypes` */
  acceptedRecipientTypes: string[];
  /** Capabilities of the provider (`text`, `html`, `json`, `file`, ...), see `hermes:listProviders` */
  capabilities: string[];
  /**
   * Audiences the account can address: those of its provider, i.e. the union
   * of the `audiences` of the provider's accepted recipient types.
   */
  audiences: string[];
}
