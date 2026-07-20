import { JSONSchema7 } from "json-schema";

import { ProviderType } from "../providers/BaseProvider";
import { MessageType } from "./MessageTypes";

export interface SerializedProvider {
  name: string;
  type: ProviderType;
  supportAttachment: boolean;
  messageType: MessageType;
  acceptedRecipientTypes: string[];
  paramsJsonSchema: JSONSchema7;
  contentJsonSchema: JSONSchema7;
  sendParamsJsonSchema: JSONSchema7;
}
