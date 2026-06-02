import { JSONSchema7 } from "json-schema";
import { PluginContext } from "kuzzle";
import { BaseAccount, BaseProvider, ProviderType } from "lib/providers";
import { vi } from "vitest";

export interface TestAccount extends BaseAccount<null> {
  options: Record<string, any>;
}

export class TestProvider extends BaseProvider<TestAccount> {
  constructor() {
    const paramsJsonSchema: JSONSchema7 = { type: "object" };
    const recipientsJsonSchema: JSONSchema7 = { type: "object" };
    const contentJsonSchema: JSONSchema7 = { type: "object" };

    super(
      "testProvider",
      ProviderType.SMS,
      paramsJsonSchema,
      recipientsJsonSchema,
      contentJsonSchema,
    );
  }

  async send(account: string, recipients: any[], content: any): Promise<any> {
    return { account, recipients, content };
  }

  _createAccount(name: string, params: Record<string, any> = {}): TestAccount {
    return {
      name,
      provider: null,
      options: params,
    };
  }
}

export const context = {
  accessors: {
    sdk: vi.fn(),
    trigger: vi.fn(),

    strategies: {
      add: vi.fn(),
      remove: vi.fn(),
    },

    validation: {
      addType: vi.fn(),
      validate: vi.fn(),
    },

    execute: vi.fn(),

    subscription: {
      register: vi.fn(),
      unregister: vi.fn(),
    },

    storage: {
      bootstrap: vi.fn(),
      createCollection: vi.fn(),
    },

    cluster: {
      handlers: {},
      on(event, fn) {
        this.handlers[event] = fn;
      },
      emit(event, payload) {
        return this.handlers[event]?.(payload);
      },
    },

    nodeId: "node-test-1",
  },

  config: {},

  constructors: {
    BaseValidationType: vi.fn(),
    Koncorde: vi.fn(),
    Mutex: vi.fn(),
    Repository: vi.fn(),
    Request: vi.fn(),
    RequestContext: vi.fn(),
    RequestInput: vi.fn(),
    ESClient: vi.fn(),
  },

  errors: {},
  kerror: {},
  errorsManager: {},
  secrets: {},

  log: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    silly: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  },
} as unknown as PluginContext;
