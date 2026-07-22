import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { JSONSchema7 } from "json-schema";
import {
  BadRequestError,
  Inflector,
  JSONObject,
  KuzzleError,
  MultipleErrorsError,
  NotFoundError,
  PluginContext,
} from "kuzzle";
import { RecipientTypeRegistry } from "../recipients";
import { ProviderCapabilities, SerializedProvider } from "../types";

export interface BaseAccount<T> {
  provider: T;

  options: JSONObject;

  name: string;
}

export abstract class BaseProvider<T> {
  protected config: JSONObject;
  protected context: PluginContext;

  protected name: string;

  protected accounts = new Map<string, T>();

  public capabilities: ProviderCapabilities = {
    fileAttachment: false,
    longMessage: false,
    shortMessage: false,
    json: false,
  };

  protected EVENT_ACCOUNT_ADD: string;
  protected EVENT_ACCOUNT_REMOVE: string;

  protected acceptedRecipientTypes: string[];

  protected accountParamsJsonSchema: JSONSchema7;
  protected accountParamsJsonSchemaValidator: ValidateFunction;

  protected contentJsonSchema: JSONSchema7;
  protected contentJsonSchemaValidator: ValidateFunction;

  protected sendParamsJsonSchema: JSONSchema7;
  protected sendParamsJsonSchemaValidator: ValidateFunction;

  private ajv: Ajv;
  private recipientJsonSchemaValidators = new Map<string, ValidateFunction>();

  private recipientTypeRegistry: RecipientTypeRegistry;
  get sdk() {
    return this.context.accessors.sdk;
  }

  get cluster() {
    return this.context.accessors.cluster;
  }

  constructor(
    name: string,
    acceptedRecipientTypes: string[],
    paramsJsonSchema: JSONSchema7,
    contentJsonSchema: JSONSchema7,
    sendParamsJsonSchema: JSONSchema7 = {},
    recipientTypeRegistry: RecipientTypeRegistry,
  ) {
    this.name = name;
    this.acceptedRecipientTypes = acceptedRecipientTypes;
    this.accountParamsJsonSchema = paramsJsonSchema;
    this.contentJsonSchema = contentJsonSchema;
    this.sendParamsJsonSchema = sendParamsJsonSchema;
    this.recipientTypeRegistry = recipientTypeRegistry;
    this.ajv = new Ajv();
    addFormats(this.ajv);
    this.accountParamsJsonSchemaValidator = this.ajv.compile(
      this.accountParamsJsonSchema,
    );
    this.contentJsonSchemaValidator = this.ajv.compile(this.contentJsonSchema);
    this.sendParamsJsonSchemaValidator = this.ajv.compile(
      this.sendParamsJsonSchema,
    );
    for (const recipientTypeName of this.acceptedRecipientTypes) {
      const definition = this.recipientTypeRegistry.get(recipientTypeName);
      const validator = this.ajv.compile(definition.jsonSchema);
      this.recipientJsonSchemaValidators.set(recipientTypeName, validator);
    }
    this.EVENT_ACCOUNT_ADD = `${this.name}:account:add`;
    this.EVENT_ACCOUNT_REMOVE = `${this.name}:account:remove`;
  }

  async init(config: JSONObject, context: PluginContext) {
    this.config = config;
    this.context = context;

    this.cluster.on(this.EVENT_ACCOUNT_ADD, async ({ name, params }) => {
      try {
        await this.nodeAddAccount(name, params);
      } catch (error) {
        this.context.log.error(
          `${Inflector.upFirst(this.name)}: Cannot sync (add) account "${name}"`,
        );
      }
    });

    this.cluster.on(this.EVENT_ACCOUNT_REMOVE, async ({ name }) => {
      try {
        await this.nodeRemoveAccount(name);
      } catch (error) {
        this.context.log.error(
          `${Inflector.upFirst(
            this.name,
          )}: Cannot sync (remove) account "${name}"`,
        );
      }
    });
  }

  getName(): string {
    return this.name;
  }

  getParamsJsonSchema(): JSONSchema7 {
    return this.accountParamsJsonSchema;
  }

  getAcceptedRecipientTypes(): string[] {
    return this.acceptedRecipientTypes;
  }

  serialize(): SerializedProvider {
    return {
      name: this.name,
      capabilities: this.capabilities,
      acceptedRecipientTypes: this.acceptedRecipientTypes,
      paramsJsonSchema: this.accountParamsJsonSchema,
      contentJsonSchema: this.contentJsonSchema,
      sendParamsJsonSchema: this.sendParamsJsonSchema,
    };
  }

  abstract send(
    account: string,
    recipients: any[],
    content: any,
    ...args
  ): Promise<void>;

  protected abstract _createAccount(
    name: string,
    params: Record<string, unknown>,
  ): T;

  /**
   * Adds an account to send message with.
   *
   * @param name Account name
   * @param args Any credentials needed to initialize the associated provider
   */
  addAccount(name: string, params: Record<string, unknown>) {
    if (this.accounts.has(name)) {
      throw new BadRequestError(
        `${Inflector.upFirst(this.name)} account "${name}" already exists.`,
      );
    }

    this.nodeAddAccount(name, params);

    if (global.app.started) {
      this.cluster
        .broadcast(this.EVENT_ACCOUNT_ADD, { name, params })
        .catch((error) => {
          this.context.log.error(
            `${Inflector.upFirst(
              this.name,
            )}: Cannot send sync message to add account "${name}": ${error}`,
          );
        });
    }
  }

  validateAccountParams(params: JSONObject): void {
    const valid = this.accountParamsJsonSchemaValidator(params);

    if (valid === false) {
      const errors = (this.accountParamsJsonSchemaValidator?.errors ?? []).map(
        (e) =>
          new KuzzleError(
            e?.message ?? "An error occured with the param validation schema",
            400,
          ),
      );
      throw new MultipleErrorsError(
        "Parameters format does not match with the json schema defined in the provider",
        errors,
      );
    }
  }

  validateRecipients(recipient: unknown, recipientTypeName?: string): void {
    const resolvedTypeName = this.resolveRecipientTypeName(recipientTypeName);
    const validator = this.getRecipientJsonSchemaValidator(resolvedTypeName);

    const valid = validator(recipient);

    if (valid === false) {
      const errors = (validator?.errors ?? []).map(
        (e) =>
          new KuzzleError(
            e?.message ??
              "An error occured with the recipient validation schema",
            400,
          ),
      );
      throw new MultipleErrorsError(
        `Recipient format does not match with the json schema defined for recipient type "${resolvedTypeName}"`,
        errors,
      );
    }
  }

  private resolveRecipientTypeName(recipientTypeName?: string): string {
    if (recipientTypeName) {
      if (!this.acceptedRecipientTypes.includes(recipientTypeName)) {
        throw new BadRequestError(
          `${Inflector.upFirst(this.name)} does not accept recipient type "${recipientTypeName}" (accepted: ${this.acceptedRecipientTypes.join(", ")}).`,
        );
      }

      return recipientTypeName;
    }

    if (this.acceptedRecipientTypes.length === 1) {
      return this.acceptedRecipientTypes[0];
    }

    throw new BadRequestError(
      `${Inflector.upFirst(this.name)} accepts multiple recipient types (${this.acceptedRecipientTypes.join(", ")}); recipientTypeName must be specified explicitly.`,
    );
  }

  private getRecipientJsonSchemaValidator(
    recipientTypeName: string,
  ): ValidateFunction {
    const validator = this.recipientJsonSchemaValidators.get(recipientTypeName);

    if (!validator) {
      throw new NotFoundError(
        `Could not retrieve recipient validator for recipient type "${recipientTypeName}"`,
      );
    }

    return validator;
  }

  validateContent(content: JSONObject): void {
    const valid = this.contentJsonSchemaValidator(content);

    if (valid === false) {
      const errors = (this.contentJsonSchemaValidator?.errors ?? []).map(
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

  validateSendParams(params: JSONObject): void {
    const valid = this.sendParamsJsonSchemaValidator(params);

    if (valid === false) {
      const errors = (this.sendParamsJsonSchemaValidator?.errors ?? []).map(
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

  nodeAddAccount(name: string, params: Record<string, unknown>) {
    this.logInfo(`${Inflector.upFirst(this.name)}: register account "${name}"`);

    this.accounts.set(name, this._createAccount(name, params));
  }

  removeAccount(name: string) {
    if (!this.accounts.has(name)) {
      throw new NotFoundError(
        `${Inflector.upFirst(this.name)} account "${name}" does not exists.`,
      );
    }

    this.nodeRemoveAccount(name);

    if (global.app.started) {
      this.cluster
        .broadcast(this.EVENT_ACCOUNT_REMOVE, { name })
        .catch((error) => {
          this.context.log.error(
            `${Inflector.upFirst(
              this.name,
            )}: Cannot send sync message to add account "${name}": ${error}`,
          );
        });
    }
  }

  nodeRemoveAccount(name: string) {
    this.logInfo(`${Inflector.upFirst(this.name)}: remove account "${name}"`);

    this.accounts.delete(name);
  }

  listAccounts(): Array<{ name: string; options: JSONObject }> {
    const accounts = [];

    for (const [accountName, account] of this.accounts.entries() as any) {
      accounts.push({ name: accountName, options: account.options });
    }

    return accounts;
  }

  getAccount(accountName: string): T {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exists.`);
    }

    return this.accounts.get(accountName) as T;
  }

  private logInfo(message: string) {
    if (this.context) {
      this.context.log.info(message);
    } else {
      console.log(`[hermes-messenger] ${message}`); //eslint-disable-line no-console
    }
  }
}
