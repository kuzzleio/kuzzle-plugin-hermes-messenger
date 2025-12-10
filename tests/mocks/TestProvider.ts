import { JSONSchema7 } from "json-schema";
import { BaseAccount, BaseProvider, ProviderType } from "lib/providers";

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

  _createAccount(name: string, options?: any): TestAccount {
    return {
      name,
      provider: null,
      options: options || {},
    };
  }
}
