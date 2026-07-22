import { JSONSchema7 } from "json-schema";
import { ProviderCapabilities } from "./ProviderCapabilities";

export interface SerializedProvider {
  name: string;
  capabilities: ProviderCapabilities;
  acceptedRecipientTypes: string[];
  paramsJsonSchema: JSONSchema7;
  contentJsonSchema: JSONSchema7;
  sendParamsJsonSchema: JSONSchema7;
}
