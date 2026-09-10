import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { JSONSchema7 } from "json-schema";
import {
  BadRequestError,
  Inflector,
  InternalError,
  JSONObject,
  KuzzleError,
  MultipleErrorsError,
  NotFoundError,
  PluginContext,
} from "kuzzle";
import {
  getFilteredAudiences,
  matchesRecipientTypeFilter,
  RecipientTypeDefinition,
  RecipientTypeFilter,
  RecipientTypeRegistry,
} from "../recipients";
import { ProviderCapabilities, SerializedProvider } from "../types";

/**
 * An account registered on a provider.
 *
 * @typeParam TClient live client used to send messages (an SDK instance, a
 *   nodemailer transporter, `null` for plain HTTP APIs...)
 * @typeParam TParams shape of the parameters the account was created with,
 *   matching the provider's `accountParamsSchema`
 */
export interface BaseAccount<TClient, TParams = Record<string, unknown>> {
  /** Account identifier, unique within the provider; used in routes and arguments */
  accountId: string;

  /** Label for user interfaces; defaults to `accountId`. Set by `BaseProvider`. */
  displayName?: string;

  /** Live client used to deliver messages */
  provider: TClient;

  /**
   * Parameters received by `addAccount` (`body.params`), kept as-is so that
   * the provider can read them at send time (e.g. `default_sender`). They
   * usually contain credentials: they are never exposed by `listAccounts`.
   */
  params: TParams;
}

export abstract class BaseProvider<T extends BaseAccount<unknown, any>> {
  protected config: JSONObject;
  protected context: PluginContext;

  /** Label for user interfaces, given by the provider implementation. */
  protected displayName: string;

  /**
   * Identifier used in routes and arguments, given by `registerProvider()` /
   * `ProviderManager.set()`. Undefined until then.
   */
  private providerId?: string;

  protected accounts = new Map<string, T>();

  /**
   * What this provider can carry in a message, e.g. `["text", "html", "file"]`
   * for an email provider or `["text"]` for SMS. See the
   * `PROVIDER_CAPABILITY_*` constants. Empty by default.
   */
  public capabilities: ProviderCapabilities = [];

  protected EVENT_ACCOUNT_ADD: string;
  protected EVENT_ACCOUNT_REMOVE: string;

  protected acceptedRecipientTypes: string[];

  protected accountParamsSchema: JSONSchema7;
  protected accountParamsValidator: ValidateFunction;

  protected messageContentSchema: JSONSchema7;
  protected messageContentValidator: ValidateFunction;

  protected messageAdditionalParamsSchema: JSONSchema7;
  protected messageAdditionalParamsValidator: ValidateFunction;

  private ajv: Ajv;
  private recipientJsonSchemaValidators = new Map<string, ValidateFunction>();

  /**
   * Registry injected by the plugin when the provider is registered
   * (see `HermesMessengerPlugin.registerProvider`). Undefined until then.
   */
  private recipientTypeRegistry?: RecipientTypeRegistry;
  get sdk() {
    return this.context.accessors.sdk;
  }

  get cluster() {
    return this.context.accessors.cluster;
  }

  constructor(
    displayName: string,
    acceptedRecipientTypes: string[],
    accountParamsSchema: JSONSchema7,
    messageContentSchema: JSONSchema7,
    messageAdditionalParamsSchema: JSONSchema7 = {},
  ) {
    this.displayName = displayName;
    this.acceptedRecipientTypes = acceptedRecipientTypes;
    this.accountParamsSchema = accountParamsSchema;
    this.messageContentSchema = messageContentSchema;
    this.messageAdditionalParamsSchema = messageAdditionalParamsSchema;
    // allErrors: report every violation at once (see validateAccountParams)
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.accountParamsValidator = this.ajv.compile(this.accountParamsSchema);
    this.messageContentValidator = this.ajv.compile(this.messageContentSchema);
    this.messageAdditionalParamsValidator = this.ajv.compile(
      this.messageAdditionalParamsSchema,
    );
    this.setEventNames(displayName);
  }

  /**
   * Bind the provider to its identifier. Called by `ProviderManager.set()`
   * (hence by `HermesMessengerPlugin.registerProvider()`); custom providers do
   * not need to call it themselves.
   */
  setProviderId(providerId: string): void {
    this.providerId = providerId;
    this.setEventNames(providerId);
  }

  private setEventNames(prefix: string): void {
    this.EVENT_ACCOUNT_ADD = `${prefix}:account:add`;
    this.EVENT_ACCOUNT_REMOVE = `${prefix}:account:remove`;
  }

  /** Prefix of every log and error message: the provider id once registered. */
  private get label(): string {
    return Inflector.upFirst(this.providerId ?? this.displayName);
  }

  /**
   * Bind the provider to the plugin's recipient type registry and compile a
   * validator for each accepted recipient type.
   *
   * Called by `HermesMessengerPlugin.registerProvider`; custom providers do not
   * need to call it themselves.
   *
   * @throws NotFoundError if an accepted recipient type is not registered
   */
  bindRecipientTypes(recipientTypeRegistry: RecipientTypeRegistry): void {
    const validators = new Map<string, ValidateFunction>();

    for (const recipientTypeName of this.acceptedRecipientTypes) {
      const definition = recipientTypeRegistry.get(recipientTypeName);
      validators.set(
        recipientTypeName,
        this.ajv.compile(definition.jsonSchema),
      );
    }

    this.recipientTypeRegistry = recipientTypeRegistry;
    this.recipientJsonSchemaValidators = validators;
  }

  async init(config: JSONObject, context: PluginContext) {
    this.config = config;
    this.context = context;

    this.cluster.on(
      this.EVENT_ACCOUNT_ADD,
      async ({ accountId, params, displayName }) => {
        try {
          this.nodeAddAccount(accountId, params, displayName);
        } catch (error) {
          this.context.log.error(
            `${this.label}: Cannot sync (add) account "${accountId}"`,
          );
        }
      },
    );

    this.cluster.on(this.EVENT_ACCOUNT_REMOVE, async ({ accountId }) => {
      try {
        this.nodeRemoveAccount(accountId);
      } catch (error) {
        this.context.log.error(
          `${this.label}: Cannot sync (remove) account "${accountId}"`,
        );
      }
    });
  }

  /**
   * Identifier of the provider, as used in routes and arguments.
   *
   * @throws InternalError before the provider is registered on the plugin
   */
  getProviderId(): string {
    if (this.providerId === undefined) {
      throw new InternalError(
        `${this.label} is not registered on the plugin yet: its provider id is only available once registerProvider() has been called.`,
      );
    }

    return this.providerId;
  }

  /** Label of the provider for user interfaces. */
  getDisplayName(): string {
    return this.displayName;
  }

  /** JSON Schema of the `params` passed to `addAccount`. */
  getAccountParamsSchema(): JSONSchema7 {
    return this.accountParamsSchema;
  }

  /** JSON Schema of the `content` passed to `sendMessage`. */
  getMessageContentSchema(): JSONSchema7 {
    return this.messageContentSchema;
  }

  /** JSON Schema of the optional `params` passed to `sendMessage`. */
  getMessageAdditionalParamsSchema(): JSONSchema7 {
    return this.messageAdditionalParamsSchema;
  }

  getAcceptedRecipientTypes(): string[] {
    return this.acceptedRecipientTypes;
  }

  /**
   * Definitions of the recipient types accepted by this provider.
   *
   * @throws InternalError before `registerProvider()` bound the registry
   */
  getAcceptedRecipientTypeDefinitions(): RecipientTypeDefinition[] {
    const registry = this.getRecipientTypeRegistry();

    return this.acceptedRecipientTypes.map((name) => registry.get(name));
  }

  /**
   * Whether this provider has every given capability. An empty list always
   * matches.
   */
  hasCapabilities(capabilities: string[]): boolean {
    return capabilities.every((capability) =>
      this.capabilities.includes(capability),
    );
  }

  /**
   * Every audience this provider can address: the deduplicated union of the
   * `audiences` of its accepted recipient types, in declaration order.
   *
   * @throws InternalError before `registerProvider()` bound the registry
   */
  getAudiences(): string[] {
    const audiences = new Set<string>();

    for (const definition of this.getAcceptedRecipientTypeDefinitions()) {
      for (const audience of definition.audiences) {
        audiences.add(audience);
      }
    }

    return Array.from(audiences);
  }

  /**
   * Whether at least one accepted recipient type satisfies the filter (e.g.
   * belongs to one of the given audiences). An empty filter always matches.
   */
  acceptsRecipientTypes(filter: RecipientTypeFilter = {}): boolean {
    if (getFilteredAudiences(filter).length === 0) {
      return true;
    }

    return this.getAcceptedRecipientTypeDefinitions().some((definition) =>
      matchesRecipientTypeFilter(definition, filter),
    );
  }

  serialize(): SerializedProvider {
    return {
      providerId: this.getProviderId(),
      displayName: this.displayName,
      capabilities: this.capabilities,
      acceptedRecipientTypes: this.acceptedRecipientTypes,
      audiences: this.getAudiences(),
      accountParamsSchema: this.accountParamsSchema,
      messageContentSchema: this.messageContentSchema,
      messageAdditionalParamsSchema: this.messageAdditionalParamsSchema,
    };
  }

  abstract sendMessage(
    account: string,
    recipients: string[],
    content: any,
    ...args
  ): Promise<void>;

  /**
   * Build the in-memory account from the `addAccount` parameters: create the
   * live client and return `{ accountId, provider, params }` (`displayName` is
   * set by `BaseProvider`).
   */
  protected abstract _createAccount(
    accountId: string,
    params: Record<string, unknown>,
  ): T;

  /**
   * Adds an account to send message with.
   *
   * The parameters are validated against `accountParamsSchema` before the
   * account is created on this node and synchronized to the other cluster
   * nodes (which do not validate again).
   *
   * @param accountId Account identifier, unique within the provider
   * @param params Parameters matching `accountParamsSchema` (credentials,
   *   default sender...), kept on the account
   * @param displayName Optional label for user interfaces (defaults to the id)
   * @throws BadRequestError if an account with this id already exists, or if
   *   the provider could not create the account from these parameters
   * @throws MultipleErrorsError listing every parameter violating the schema
   */
  addAccount(
    accountId: string,
    params: Record<string, unknown>,
    displayName?: string,
  ) {
    const label = `${this.label}: account "${accountId}"`;

    if (this.accounts.has(accountId)) {
      throw new BadRequestError(
        `${this.label} account "${accountId}" already exists.`,
      );
    }

    try {
      this.validateAccountParams(params);
    } catch (error) {
      // Parameter values are never logged: they hold credentials.
      const details =
        error instanceof MultipleErrorsError
          ? error.errors.map((e) => e.message).join("; ")
          : (error as Error).message;

      this.logWarn(`${label} rejected, invalid parameters: ${details}`);
      throw error;
    }

    try {
      this.nodeAddAccount(accountId, params, displayName);
    } catch (error) {
      this.logError(
        `${label} could not be created: ${(error as Error).message}`,
      );

      if (error instanceof KuzzleError) {
        throw error;
      }

      throw new BadRequestError(
        `${label} could not be created: ${(error as Error).message}`,
      );
    }

    if (global.app.started) {
      this.cluster
        .broadcast(this.EVENT_ACCOUNT_ADD, { accountId, params, displayName })
        .catch((error) => {
          this.context.log.error(
            `${this.label}: Cannot send sync message to add account "${accountId}": ${error}`,
          );
        });
    }
  }

  /**
   * Validate account parameters against `accountParamsSchema`.
   *
   * Called by `addAccount()`; also available to validate parameters ahead of
   * time (e.g. in a configuration form handler).
   *
   * @throws MultipleErrorsError listing every violation, each message prefixed
   *   by the offending path (e.g. `/port must be integer`)
   */
  validateAccountParams(params: JSONObject): void {
    const valid = this.accountParamsValidator(params);

    if (valid === false) {
      const errors = (this.accountParamsValidator?.errors ?? []).map(
        (e) =>
          new KuzzleError(
            `${e.instancePath || "params"} ${e.message ?? "does not match the account params schema"}`,
            400,
          ),
      );
      throw new MultipleErrorsError(
        `${this.label}: account parameters do not match the provider's accountParamsSchema (${errors.length} error(s))`,
        errors,
      );
    }
  }

  /**
   * Validate the recipients of a message.
   *
   * Recipients are plain strings (an email address, a phone number, a topic
   * name, a webhook URL, ...). Each one must match the JSON Schema of at least
   * one of the recipient types accepted by this provider.
   *
   * @returns for each recipient, the name of the recipient type it matched
   * @throws BadRequestError if `recipients` is not a non-empty array of strings
   * @throws MultipleErrorsError listing every recipient matching no accepted type
   */
  validateRecipients(recipients: unknown): string[] {
    if (
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      recipients.some((r) => typeof r !== "string" || r.length === 0)
    ) {
      throw new BadRequestError(
        `${this.label}: "recipients" must be a non-empty array of non-empty strings.`,
      );
    }

    const matchedTypes: string[] = [];
    const errors: KuzzleError[] = [];

    for (const [index, recipient] of recipients.entries()) {
      const matched = this.acceptedRecipientTypes.find((typeName) =>
        this.getRecipientJsonSchemaValidator(typeName)(recipient),
      );

      if (matched === undefined) {
        errors.push(
          new KuzzleError(
            `Recipient #${index} "${recipient}" matches none of the accepted recipient types (${this.acceptedRecipientTypes.join(", ")}).`,
            400,
          ),
        );
        continue;
      }

      matchedTypes.push(matched);
    }

    if (errors.length > 0) {
      throw new MultipleErrorsError(
        `${this.label}: ${errors.length} invalid recipient(s)`,
        errors,
      );
    }

    return matchedTypes;
  }

  private getRecipientTypeRegistry(): RecipientTypeRegistry {
    if (!this.recipientTypeRegistry) {
      throw new InternalError(
        `${this.label} is not registered on the plugin yet: recipient types are only available once registerProvider() has been called.`,
      );
    }

    return this.recipientTypeRegistry;
  }

  private getRecipientJsonSchemaValidator(
    recipientTypeName: string,
  ): ValidateFunction {
    this.getRecipientTypeRegistry();

    const validator = this.recipientJsonSchemaValidators.get(recipientTypeName);

    if (!validator) {
      throw new NotFoundError(
        `Could not retrieve recipient validator for recipient type "${recipientTypeName}"`,
      );
    }

    return validator;
  }

  validateMessageContent(content: JSONObject): void {
    const valid = this.messageContentValidator(content);

    if (valid === false) {
      const errors = (this.messageContentValidator?.errors ?? []).map(
        (e) =>
          new KuzzleError(
            e.message ?? "An error occured with the content validation schema",
            400,
          ),
      );
      throw new MultipleErrorsError(
        "Content format does not match with the json schema defined in the provider",
        errors,
      );
    }
  }

  validateMessageAdditionalParams(params: JSONObject): void {
    const valid = this.messageAdditionalParamsValidator(params);

    if (valid === false) {
      const errors = (this.messageAdditionalParamsValidator?.errors ?? []).map(
        (e) =>
          new KuzzleError(
            e.message ?? "An error occured with send params validation schema",
            400,
          ),
      );
      throw new MultipleErrorsError(
        "Send params format does not match with the json schema defined in the provider",
        errors,
      );
    }
  }

  nodeAddAccount(
    accountId: string,
    params: Record<string, unknown>,
    displayName?: string,
  ) {
    this.logInfo(`${this.label}: register account "${accountId}"`);

    const account = this._createAccount(accountId, params);
    account.displayName = displayName ?? accountId;

    this.accounts.set(accountId, account);
  }

  removeAccount(accountId: string) {
    if (!this.accounts.has(accountId)) {
      throw new NotFoundError(
        `${this.label} account "${accountId}" does not exists.`,
      );
    }

    this.nodeRemoveAccount(accountId);

    if (global.app.started) {
      this.cluster
        .broadcast(this.EVENT_ACCOUNT_REMOVE, { accountId })
        .catch((error) => {
          this.context.log.error(
            `${this.label}: Cannot send sync message to remove account "${accountId}": ${error}`,
          );
        });
    }
  }

  nodeRemoveAccount(accountId: string) {
    this.logInfo(`${this.label}: remove account "${accountId}"`);

    this.accounts.delete(accountId);
  }

  /** Identifiers of the registered accounts. */
  listAccounts(): string[] {
    return Array.from(this.accounts.keys());
  }

  getAccount(accountId: string): T {
    if (!this.accounts.has(accountId)) {
      throw new NotFoundError(`Account "${accountId}" does not exists.`);
    }

    return this.accounts.get(accountId) as T;
  }

  private logInfo(message: string) {
    this.log("info", message);
  }

  private logWarn(message: string) {
    this.log("warn", message);
  }

  private logError(message: string) {
    this.log("error", message);
  }

  /**
   * Log through the plugin context once available (`init()`), on the console
   * before that (accounts registered at application startup).
   */
  private log(level: "info" | "warn" | "error", message: string) {
    if (this.context) {
      this.context.log[level](message);
    } else {
      console[level](`[hermes-messenger] ${message}`); //eslint-disable-line no-console
    }
  }
}
