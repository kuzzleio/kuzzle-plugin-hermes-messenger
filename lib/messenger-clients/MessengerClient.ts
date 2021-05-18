import {
  JSONObject,
  PluginContext,
  EmbeddedSDK,
  PluginImplementationError,
  Inflector,
  BadRequestError,
  NotFoundError,
} from 'kuzzle';


export abstract class MessengerClient<T> {
  protected config: JSONObject;
  protected context: PluginContext;

  protected name: string;

  protected _commonClient: T;

  protected privateClients = new Map<string, T>();

  get commonClient (): T {
    if (! this.commonClient) {
      throw new PluginImplementationError(`${Inflector.upFirst(this.name)} common client is not initialized.`);
    }

    return this._commonClient;
  }

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

  protected abstract _addAccount (name: string, ...args);

  protected abstract _initCommonClient (...args);

  addAccount (name: string, ...args) {
    if (this.privateClients.has(name)) {
      throw new BadRequestError(`${Inflector.upFirst(this.name)} account "${name}" already exists.`);
    }

    this._addAccount(name, ...args);
  }

  removeAccount (name: string) {
    if (! this.privateClients.has(name)) {
      throw new NotFoundError(`${Inflector.upFirst(this.name)} account "${name}" does not exists.`);
    }

    this.privateClients.delete(name);
  }

  listAccounts () {
    return this.privateClients.keys();
  }

  initCommonClient (...args) {
    this._initCommonClient(...args);

    this.context.log.debug(`${Inflector.upFirst(this.name)} common client initialized.`);
  }
}
