---
code: false
type: page
title: Custom Provider
description: How to implement a custom provider using BaseProvider
order: 200
---

# Custom Provider

Hermes Messenger is extensible. Any messaging service can be integrated by extending the `BaseProvider<T>` abstract class exported from the package.

---

## 1. Define the account interface

The account interface describes what is stored in memory for each registered account. The `options` field is the only part exposed by `listAccounts` — never put credentials there.

```typescript
import { BaseAccount } from 'kuzzle-plugin-hermes-messenger';

interface MyAccount extends BaseAccount<MyClient> {
  provider: MyClient;     // the live SDK client
  options: {
    defaultSender: string; // safe to expose
  };
}
```

---

## 2. Implement the provider class

```typescript
import { BaseProvider, ProviderType } from 'kuzzle-plugin-hermes-messenger';
import { JSONSchema7 } from 'json-schema';

export class MyProvider extends BaseProvider<MyAccount> {
  constructor() {
    // paramsJsonSchema: shape of the credentials passed to addAccount
    const paramsJsonSchema: JSONSchema7 = {
      type: 'object',
      properties: {
        apiKey:        { type: 'string', minLength: 1 },
        defaultSender: { type: 'string', minLength: 1 },
      },
      required: ['apiKey', 'defaultSender'],
    };

    // recipientsJsonSchema: shape of each element in the recipients array
    const recipientsJsonSchema: JSONSchema7 = {
      type: 'object',
      properties: {
        to: { type: 'string' },
      },
      required: ['to'],
    };

    // contentJsonSchema: shape of the content object
    const contentJsonSchema: JSONSchema7 = {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    };

    super('my-provider', ProviderType.SMS, paramsJsonSchema, recipientsJsonSchema, contentJsonSchema);
  }

  /**
   * Called by addAccount() — create and store a live SDK client.
   * The order of positional args must match Object.values() of the params body.
   */
  protected _createAccount(name: string, apiKey: string, defaultSender: string): MyAccount {
    return {
      name,
      provider: new MyClient(apiKey),
      options: { defaultSender }, // credentials are NOT included here
    };
  }

  /**
   * Send a message. The params object is passed directly from the request body's
   * "params" field by the controller.
   */
  async send(
    accountName: string,
    recipients: Array<{ to: string }>,
    content: { text: string },
    params: { from?: string } = {}
  ): Promise<void> {
    const account = this.getAccount(accountName);
    const sender = params.from ?? account.options.defaultSender;

    await Promise.all(
      recipients.map((r) =>
        account.provider.send({ to: r.to, from: sender, text: content.text })
      )
    );
  }
}
```

---

## 3. Register the provider

Providers must be registered before `app.start()` is called:

```typescript
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';
import { MyProvider } from './providers/MyProvider';

const plugin = new HermesMessengerPlugin();
plugin.registerProvider('my-provider', new MyProvider());
app.plugin.use(plugin);
```

---

## 4. Add accounts at startup

```typescript
await app.start();

plugin.getProvider('my-provider').addAccount(
  'default',        // account name
  'my_api_key',     // apiKey
  'sender@example.com' // defaultSender
);
```

Or via the HTTP API:

```http
POST /_/hermes/providers/my-provider/accounts
Content-Type: application/json

{
  "params": {
    "apiKey": "my_api_key",
    "defaultSender": "sender@example.com"
  }
}
```

---

## 5. Send a message

```http
POST /_/hermes/providers/my-provider/accounts/default
Content-Type: application/json

{
  "recipients": [{ "to": "+33600000000" }],
  "content": { "text": "Hello!" },
  "params": {}
}
```

---

## BaseProvider API reference

| Method | Description |
|---|---|
| `addAccount(name, ...args)` | Register an account; triggers cluster sync |
| `removeAccount(name)` | Remove a registered account |
| `getAccount(name)` | Retrieve a registered account (throws if not found) |
| `listAccounts()` | Returns `[{ name, options }]` for all accounts |
| `validateParams(params)` | Validate against `paramsJsonSchema` |
| `validateRecipients(recipients)` | Validate against `recipientsJsonSchema` |
| `validateContent(content)` | Validate against `contentJsonSchema` |
| `getName()` | Returns the provider name |

### Protected properties available in `send()` and `sendMessage()`

| Property | Description |
|---|---|
| `this.context` | Kuzzle plugin context |
| `this.config` | Plugin configuration (includes `adminIndex`, `mockedAccounts`) |
| `this.sdk` | Kuzzle embedded SDK shortcut |
| `this.cluster` | Kuzzle cluster accessor |
