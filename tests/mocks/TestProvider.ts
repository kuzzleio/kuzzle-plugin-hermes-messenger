import { JSONSchema7 } from "json-schema";
import { PluginContext } from "kuzzle";
import { BaseAccount, BaseProvider } from "lib/providers";
import { RecipientTypeRegistry } from "lib/recipients";
import { ProviderCapabilities } from "lib/types";
import { vi } from "vitest";

export type TestAccount = BaseAccount<null, Record<string, any>>;

export class TestProvider extends BaseProvider<TestAccount> {
  override capabilities: ProviderCapabilities = ["text"];
  constructor(
    recipientTypeRegistry: RecipientTypeRegistry = new RecipientTypeRegistry(),
    acceptedRecipientTypes: string[] = ["testRecipient"],
    accountParamsSchema: JSONSchema7 = { type: "object" },
  ) {
    const messageContentSchema: JSONSchema7 = { type: "object" };
    const messageAdditionalParamsSchema: JSONSchema7 = { type: "object" };

    if (!recipientTypeRegistry.has("testRecipient")) {
      recipientTypeRegistry.register({
        name: "testRecipient",
        description: "Test recipient type",
        audiences: ["human"],
        jsonSchema: { type: "string" },
      });
    }

    super(
      "testProvider",
      acceptedRecipientTypes,
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );

    // The plugin does this in registerProvider(); the mock binds itself so
    // that unit tests can exercise recipient validation directly.
    this.bindRecipientTypes(recipientTypeRegistry);
  }

  async sendMessage(
    account: string,
    recipients: string[],
    content: any,
  ): Promise<any> {
    return { account, recipients, content };
  }

  _createAccount(
    accountId: string,
    params: Record<string, any> = {},
  ): TestAccount {
    return { accountId, provider: null, params };
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
