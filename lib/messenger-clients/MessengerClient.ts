import {
  JSONObject,
  PluginContext,
  EmbeddedSDK,
  Inflector,
  BadRequestError,
  NotFoundError,
} from 'kuzzle';


export interface BaseAccount<T> {
  client: T;

  options: JSONObject;
}

export abstract class MessengerClient<T> {
  protected config: JSONObject;
  protected context: PluginContext;

  protected name: string;

  protected accounts = new Map<string, T>();

  get sdk(): EmbeddedSDK {
    return this.context.accessors.sdk;
  }

  constructor (name: string) {
    this.name = name
  }

  async init (config: JSONObject, context: PluginContext) {
    this.config = config;
    this.context = context;
  }

  protected abstract _createAccount ( ...args): T;

  /**
   * Adds an account to send message with.
   *
   * @param name Account name
   * @param args Any credentials needed to initialize the associated client
   */
  addAccount (name: string, ...args) {
    if (this.accounts.has(name)) {
      throw new BadRequestError(`${Inflector.upFirst(this.name)} account "${name}" already exists.`);
    }

    this.context.log.info(`${Inflector.upFirst(this.name)}: register account "${name}"`);

    this.accounts.set(name, this._createAccount(...args));
  }

  /**
   * Removes an account
   *
   * @param name Account name
   */
  removeAccount (name: string) {
    if (! this.accounts.has(name)) {
      throw new NotFoundError(`${Inflector.upFirst(this.name)} account "${name}" does not exists.`);
    }

    this.context.log.info(`${Inflector.upFirst(this.name)}: remove account "${name}"`);

    this.accounts.delete(name);
  }

  /**
   * Lists available accounts
   *
   * @returns Account names
   */
  listAccounts (): Array<{ name: string, options: JSONObject}> {
    const accounts = [];

    for (const [accountName, account] of this.accounts.entries() as any) {
      accounts.push({ name: accountName, options: account.options });
    }

    return accounts;
  }

  protected getAccount (accountName: string): T {
    if (! this.accounts.has(accountName)) {
      throw new NotFoundError(`Account "${accountName}" does not exists.`);
    }

    return this.accounts.get(accountName);
  }
}
