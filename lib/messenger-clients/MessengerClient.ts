import {
  JSONObject,
  PluginContext,
  EmbeddedSDK,
  Inflector,
  BadRequestError,
  NotFoundError,
} from 'kuzzle';


export abstract class MessengerClient<T> {
  static COMMON_CLIENT_NAME = 'common';

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

  addAccount (name: string, ...args) {
    if (this.accounts.has(name)) {
      throw new BadRequestError(`${Inflector.upFirst(this.name)} account "${name}" already exists.`);
    }

    this.accounts.set(name, this._createAccount(...args));
  }

  removeAccount (name: string) {
    if (! this.accounts.has(name)) {
      throw new NotFoundError(`${Inflector.upFirst(this.name)} account "${name}" does not exists.`);
    }

    this.accounts.delete(name);
  }

  listAccounts () {
    return Array.from(this.accounts.keys()).sort();
  }

  initCommonClient (...args) {
    if (this.accounts.has(MessengerClient.COMMON_CLIENT_NAME)) {
      throw new BadRequestError(`${Inflector.upFirst(this.name)} account "${MessengerClient.COMMON_CLIENT_NAME}" already exists.`);
    }

    this.accounts.set(MessengerClient.COMMON_CLIENT_NAME, this._createAccount(...args));

    this.context.log.debug(`${Inflector.upFirst(this.name)} common client initialized.`);
  }
}
