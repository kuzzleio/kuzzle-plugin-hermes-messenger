import { JSONSchema7 } from "json-schema";
import { ProviderCapabilities } from "./ProviderCapabilities";

export interface SerializedProvider {
  name: string;
  capabilities: ProviderCapabilities;
  /** Names of the accepted recipient types, see `hermes:listRecipientTypes` */
  acceptedRecipientTypes: string[];
  /**
   * Every audience the provider can address: the deduplicated union of the
   * `audiences` of its accepted recipient types, in declaration order.
   */
  audiences: string[];
  accountParamsSchema: JSONSchema7;
  messageContentSchema: JSONSchema7;
  messageAdditionalParamsSchema: JSONSchema7;
}
