import {
  RECIPIENT_AUDIENCE_TECHNICAL,
  RecipientTypeDefinition,
} from "./RecipientType";

/**
 * A technical endpoint identified by an absolute URI (RFC 3986): a webhook
 * (`https://...`), a broker (`kafka://`, `mqtt://`), a storage location
 * (`s3://`, `ftp://`), ...
 *
 * Any scheme is accepted; a provider accepting `uri` is expected to check the
 * scheme it supports in `sendMessage`.
 */
export const uriRecipient: RecipientTypeDefinition = {
  name: "uri",
  description: "An absolute URI, such as a webhook URL or a broker topic",
  audiences: [RECIPIENT_AUDIENCE_TECHNICAL],
  jsonSchema: {
    type: "string",
    title: "URI",
    format: "uri",
  },
};
