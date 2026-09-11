/** Well-known capability: short plain text messages (SMS-like). */
export const PROVIDER_CAPABILITY_TEXT = "text";
/** Well-known capability: long or rich HTML content (email-like). */
export const PROVIDER_CAPABILITY_HTML = "html";
/** Well-known capability: structured JSON payloads (message brokers, webhooks...). */
export const PROVIDER_CAPABILITY_JSON = "json";
/** Well-known capability: file attachments or file transfer (email attachments, FTP, S3...). */
export const PROVIDER_CAPABILITY_FILE = "file";

/**
 * What a provider can carry in a message. Free strings; the four well-known
 * values above cover the built-in providers, custom providers may add their
 * own. Exposed by `hermes:listProviders` and used by its `capability` filter.
 */
export type ProviderCapabilities = string[];
