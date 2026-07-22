---
code: false
type: page
title: Custom Provider
description: How to implement a custom provider using BaseProvider
order: 200
---

# Custom Provider

Hermes Messenger is extensible. Any messaging service can be integrated by extending the `BaseProvider<T>` abstract class exported from the package.

Recipient validation is **mutualized** across providers: a provider does not define its own recipient schema. Instead it declares which `recipientType`s it accepts (e.g. `email`, `phoneNumber`, or a custom one you register), and validation is delegated to the [`RecipientTypeRegistry`](#registering-a-custom-recipient-type). This lets several providers share the same recipient shape (e.g. two email providers both accepting `email`).

---

## 1. Define the account interface

The account interface describes what is stored in memory for each registered account. The `options` field is the only part exposed by `listAccounts` — never put credentials there.

```typescript
import { BaseAccount } from "kuzzle-plugin-hermes-messenger";

interface MyAccount extends BaseAccount<MyClient> {
  provider: MyClient; // the live SDK client
  options: {
    defaultSender: string; // safe to expose
  };
}
```

---

## 2. Implement the provider class

```typescript
import {
  BaseProvider,
  ProviderType,
  RecipientTypeRegistry,
} from "kuzzle-plugin-hermes-messenger";
import { JSONSchema7 } from "json-schema";

export class MyProvider extends BaseProvider<MyAccount> {
  // Optional overrides — defaults are `false` / `"short"`.
  override supportAttachment = false;
  override messageType: "short" | "long" = "short";

  constructor(recipientTypeRegistry: RecipientTypeRegistry) {
    // paramsJsonSchema: shape of the credentials passed to addAccount
    const paramsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        apiKey: { type: "string", minLength: 1 },
        defaultSender: { type: "string", minLength: 1 },
      },
      required: ["apiKey", "defaultSender"],
    };

    // contentJsonSchema: shape of the content object
    const contentJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    };

    // sendParamsJsonSchema: shape of the optional `params` object passed to send()
    const sendParamsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "my-provider",
      ProviderType.SMS,
      ["phoneNumber"], // acceptedRecipientTypes — must already be registered, see below
      paramsJsonSchema,
      contentJsonSchema,
      sendParamsJsonSchema,
      recipientTypeRegistry,
    );
  }

  /**
   * Called by addAccount() — create and store a live SDK client.
   * `params` is the raw object validated against paramsJsonSchema.
   */
  protected _createAccount(
    name: string,
    { apiKey, defaultSender }: { apiKey: string; defaultSender: string },
  ): MyAccount {
    return {
      name,
      provider: new MyClient(apiKey),
      options: { defaultSender }, // credentials are NOT included here
    };
  }

  /**
   * Send a message. `recipients` are entries matching one of acceptedRecipientTypes'
   * jsonSchema (here: `phoneNumber`'s `{ to: string }`). `params` is passed directly
   * from the request body's "params" field by the controller.
   */
  async send(
    accountName: string,
    recipients: Array<{ to: string }>,
    content: { text: string },
    params: { from?: string } = {},
  ): Promise<void> {
    const account = this.getAccount(accountName);
    const sender = params.from ?? account.options.defaultSender;

    await Promise.all(
      recipients.map((r) =>
        account.provider.send({ to: r.to, from: sender, text: content.text }),
      ),
    );
  }
}
```

---

## 3. Register the provider

`acceptedRecipientTypes` must already be known to the registry when the provider is registered — `registerProvider()` throws a `BadRequestError` otherwise. Built-in types (`email`, `phoneNumber`) are registered by the plugin itself; register any custom type first (see below).

```typescript
import { HermesMessengerPlugin } from "kuzzle-plugin-hermes-messenger";
import { MyProvider } from "./providers/MyProvider";

const plugin = new HermesMessengerPlugin();

// only needed if 'my-provider' references a recipientType that isn't built in
// plugin.registerRecipientType(myCustomRecipientType);

plugin.registerProvider(
  "my-provider",
  new MyProvider(plugin.recipientTypeRegistry),
);
app.plugin.use(plugin);
```

---

## 4. Add accounts at startup

```typescript
await app.start();

plugin.getProvider("my-provider").addAccount("default", {
  apiKey: "my_api_key",
  defaultSender: "sender@example.com",
});
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

## Registering a custom recipient type

A recipient type is a named, reusable JSON Schema describing the shape of **one** recipient entry (e.g. `{ to: "…" }`). Providers reference recipient types by name in `acceptedRecipientTypes` instead of each declaring their own schema — this is what lets the `hermes:listRecipientTypes` action work across every provider.

```typescript
import {
  RecipientTypeDefinition,
  HermesMessengerPlugin,
} from "kuzzle-plugin-hermes-messenger";

const webhookUrlRecipient: RecipientTypeDefinition = {
  name: "webhookUrl", // unique registry key, referenced by acceptedRecipientTypes
  description: "An HTTP endpoint to POST the message to",
  jsonSchema: {
    type: "object",
    properties: {
      to: { type: "string", format: "uri", title: "Webhook URL" },
    },
    required: ["to"],
  },
};

const plugin = new HermesMessengerPlugin();

// Must be registered before any provider that lists 'webhookUrl' in its
// acceptedRecipientTypes.
plugin.registerRecipientType(webhookUrlRecipient);
```

Notes:

- Registering the same `name` twice with an identical definition is a no-op;
- `recipientTypeRegistry.get(name)` / `.has(name)` / `.list()` are available wherever the registry is passed (providers, controllers) to look up or enumerate definitions at runtime.
- `hermes:listRecipientTypes` (`GET /_/hermes/recipient-types`) exposes every registered `RecipientTypeDefinition` over the API.

---

## BaseProvider API reference

| Method                                              | Description                                                                                                                                                                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(name, params)`                          | Register an account; triggers cluster sync                                                                                                                                                                                             |
| `removeAccount(name)`                               | Remove a registered account                                                                                                                                                                                                            |
| `getAccount(name)`                                  | Retrieve a registered account (throws if not found)                                                                                                                                                                                    |
| `listAccounts()`                                    | Returns `[{ name, options }]` for all accounts                                                                                                                                                                                         |
| `getAcceptedRecipientTypes()`                       | Returns the `recipientType` names this provider accepts                                                                                                                                                                                |
| `validateParams(params)`                            | Validate against `paramsJsonSchema`                                                                                                                                                                                                    |
| `validateRecipients(recipient, recipientTypeName?)` | Validate one recipient against the named type's schema; if the provider accepts only one type, `recipientTypeName` can be omitted                                                                                                      |
| `validateContent(content)`                          | Validate against `contentJsonSchema`                                                                                                                                                                                                   |
| `validateSendParams(params)`                        | Validate against `sendParamsJsonSchema`                                                                                                                                                                                                |
| `getName()`                                         | Returns the provider name                                                                                                                                                                                                              |
| `serialize()`                                       | Returns a `SerializedProvider` (`name`, `type`, `supportAttachment`, `messageType`, `acceptedRecipientTypes`, `paramsJsonSchema`, `contentJsonSchema`, `sendParamsJsonSchema`) — what `hermes:listProviders` returns for each provider |

### Public properties

| Property            | Description                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supportAttachment` | Whether this provider supports attachments (default `false`)                                                     |
| `messageType`       | `"short"` or `"long"` (default `"short"`) — lets `hermes:listProviders` be filtered by message length capability |

### Protected properties available in `send()` and `sendMessage()`

| Property       | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `this.context` | Kuzzle plugin context                                          |
| `this.config`  | Plugin configuration (includes `adminIndex`, `mockedAccounts`) |
| `this.sdk`     | Kuzzle embedded SDK shortcut                                   |
| `this.cluster` | Kuzzle cluster accessor                                        |
