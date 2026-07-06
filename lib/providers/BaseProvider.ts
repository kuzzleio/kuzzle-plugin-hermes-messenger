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

export enum ProviderType {
  EMAIL = "email",
  SMS = "sms",
}

export interface BaseAccount<T> {
  provider: T;

  options: JSONObject;

  name: string;
}

export abstract class BaseProvider<T> {
  protected config: JSONObject;
  protected context: PluginContext;

  protected name: string;
  protected type: ProviderType;

  protected accounts = new Map<string, T>();

  public supportAttachment: boolean = false;
  public messageType: MessageType = "short";

  protected EVENT_ACCOUNT_ADD: string;
  protected EVENT_ACCOUNT_REMOVE: string;

  protected paramsJsonSchema: JSONSchema7;
  protected paramsJsonSchemaValidator: ValidateFunction;

  protected recipientsJsonSchema: JSONSchema7;
  protected recipientsJsonSchemaValidator: ValidateFunction;

  protected contentJsonSchema: JSONSchema7;
  protected contentJsonSchemaValidator: ValidateFunction;

  protected sendParamsJsonSchema: JSONSchema7;
  protected sendParamsJsonSchemaValidator: ValidateFunction;

  get sdk() {
    return this.context.accessors.sdk;
  }

  get cluster() {
    return this.context.accessors.cluster;
  }

  constructor(
    name: string,
    type: ProviderType,
    paramsJsonSchema: JSONSchema7,
    recipientsJsonSchema: JSONSchema7,
    contentJsonSchema: JSONSchema7,
    sendParamsJsonSchema: JSONSchema7 = {},
  ) {
    this.name = name;
    this.type = type;
    this.paramsJsonSchema = paramsJsonSchema;
    this.recipientsJsonSchema = recipientsJsonSchema;
    this.contentJsonSchema = contentJsonSchema;
    this.sendParamsJsonSchema = sendParamsJsonSchema;

    const ajv = new Ajv();
    addFormats(ajv);
    this.paramsJsonSchemaValidator = ajv.compile(this.paramsJsonSchema);
    this.recipientsJsonSchemaValidator = ajv.compile(this.recipientsJsonSchema);
    this.contentJsonSchemaValidator = ajv.compile(this.contentJsonSchema);
    this.sendParamsJsonSchemaValidator = ajv.compile(this.sendParamsJsonSchema);

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
    return this.paramsJsonSchema;
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

  validateParams(params: JSONObject): void {
    const valid = this.paramsJsonSchemaValidator(params);

    if (valid === false) {
      const errors = this.paramsJsonSchemaValidator.errors.map(
        (e) => new KuzzleError(e.message, 400),
      );
      throw new MultipleErrorsError(
        "Parameters format does not match with the json schema defined in the provider",
        errors,
      );
    }
  }

  validateRecipients(recipients: JSONObject): void {
    const valid = this.recipientsJsonSchemaValidator(recipients);

    if (valid === false) {
      const errors = this.recipientsJsonSchemaValidator.errors.map(
        (e) => new KuzzleError(e.message, 400),
      );
      throw new MultipleErrorsError(
        "Recipients format does not match with the json schema defined in the provider",
        errors,
      );
    }
  }

  validateContent(content: JSONObject): void {
    const valid = this.contentJsonSchemaValidator(content);

    if (valid === false) {
      const errors = this.contentJsonSchemaValidator.errors.map(
        (e) => new KuzzleError(e.message, 400),
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
      const errors = this.sendParamsJsonSchemaValidator.errors.map(
        (e) => new KuzzleError(e.message, 400),
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

    return this.accounts.get(accountName);
  }

  private logInfo(message: string) {
    if (this.context) {
      this.context.log.info(message);
    } else {
      console.log(`[hermes-messenger] ${message}`); //eslint-disable-line no-console
    }
  }
}
