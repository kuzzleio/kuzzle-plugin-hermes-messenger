import {
  BadRequestError,
  Inflector,
  JSONObject,
  NotFoundError,
  PluginContext,
} from "kuzzle";

export interface BaseAccount<T> {
  client: T;

  options: JSONObject;

  name: string;
}

export abstract class MessengerClient<T> {
  protected config: JSONObject;
  protected context: PluginContext;

  protected name: string;

  protected accounts = new Map<string, T>();

  protected EVENT_ACCOUNT_ADD: string;
  protected EVENT_ACCOUNT_REMOVE: string;

  get sdk() {
    return this.context.accessors.sdk;
  }

  get cluster() {
    return this.context.accessors.cluster;
  }

  constructor(name: string) {
    this.name = name;

    this.EVENT_ACCOUNT_ADD = `${this.name}:account:add`;
    this.EVENT_ACCOUNT_REMOVE = `${this.name}:account:remove`;
  }

  async init(config: JSONObject, context: PluginContext) {
    this.config = config;
    this.context = context;

    this.cluster.on(this.EVENT_ACCOUNT_ADD, async ({ name, args }) => {
      try {
        await this.nodeAddAccount(name, ...args);
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

  protected abstract _createAccount(...args): T;

  /**
   * Adds an account to send message with.
   *
   * @param name Account name
   * @param args Any credentials needed to initialize the associated client
   */
  addAccount(name: string, ...args) {
    if (this.accounts.has(name)) {
      throw new BadRequestError(
        `${Inflector.upFirst(this.name)} account "${name}" already exists.`,
      );
    }

    this.nodeAddAccount(name, ...args);

    // Account can be registered in backend code and thus executed by every node
    // at startup
    if (global.app.started) {
      this.cluster
        .broadcast(this.EVENT_ACCOUNT_ADD, { name, args })
        .catch((error) => {
          this.context.log.error(
            `${Inflector.upFirst(
              this.name,
            )}: Cannot send sync message to add account "${name}": ${error}`,
          );
        });
    }
  }

  private nodeAddAccount(name: string, ...args) {
    this.logInfo(`${Inflector.upFirst(this.name)}: register account "${name}"`);

    this.accounts.set(name, this._createAccount(name, ...args));
  }

  /**
   * Removes an account
   *
   * @param name Account name
   */
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

  private nodeRemoveAccount(name: string) {
    this.logInfo(`${Inflector.upFirst(this.name)}: remove account "${name}"`);

    this.accounts.delete(name);
  }

  /**
   * Lists available accounts
   *
   * @returns Account names
   */
  listAccounts(): Array<{ name: string; options: JSONObject }> {
    const accounts = [];

    for (const [accountName, account] of this.accounts.entries() as any) {
      accounts.push({ name: accountName, options: account.options });
    }

    return accounts;
  }

  protected getAccount(accountName: string): T {
    if (!this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exists.`);
    }

    return this.accounts.get(accountName);
  }

  protected async mockedAccount(accountName: string): Promise<boolean> {
    const configDocument = await this.sdk.document.get(
      this.config.adminIndex,
      "config",
      this.config.configDocumentId,
    );

    const mockedAccounts =
      configDocument._source["hermes-messenger"].mockedAccounts[this.name] ||
      [];

    return mockedAccounts.includes(accountName);
  }

  private logInfo(message: string) {
    if (this.context) {
      this.context.log.info(message);
    } else {
      console.log(`[hermes-messenger] ${message}`); //eslint-disable-line no-console
    }
  }
}
