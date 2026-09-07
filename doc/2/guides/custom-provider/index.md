---
code: false
type: page
title: Custom Provider
description: How to implement a custom provider using BaseProvider
order: 200
---

# Custom Provider

Hermes Messenger is extensible. Any messaging service can be integrated by extending the `BaseProvider<T>` abstract class exported from the package: an SMS gateway, a push service, a webhook endpoint, a message broker topic, ...

Recipient formats are **shared** across providers: a provider does not define its own recipient schema. Instead it declares which `recipientType`s it accepts (e.g. `email`, `phoneNumber`, or a custom one you register), and the shape of each recipient is described once in the [`RecipientTypeRegistry`](#registering-a-custom-recipient-type). This lets several providers share the same recipient shape (e.g. two email providers both accepting `email`).

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
  ProviderCapabilities,
  RecipientTypeRegistry,
} from "kuzzle-plugin-hermes-messenger";
import { JSONSchema7 } from "json-schema";

export class MyProvider extends BaseProvider<MyAccount> {
  // Declares what this provider supports — defaults are all `false`.
  override capabilities: ProviderCapabilities = {
    fileAttachment: false,
    shortMessage: true,
    longMessage: false,
    json: false,
  };

  constructor(recipientTypeRegistry: RecipientTypeRegistry) {
    // paramsJsonSchema: shape of body.params passed to addAccount
    const paramsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        apiKey: { type: "string", minLength: 1 },
        defaultSender: { type: "string", minLength: 1 },
      },
      required: ["apiKey", "defaultSender"],
    };

    // contentJsonSchema: shape of body.content passed to sendMessage
    const contentJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    };

    // sendParamsJsonSchema: shape of the optional body.params passed to sendMessage
    const sendParamsJsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "my-provider",          // display name, returned by listProviders
      ["phoneNumber"],        // acceptedRecipientTypes — must already be registered, see below
      paramsJsonSchema,
      contentJsonSchema,
      sendParamsJsonSchema,
      recipientTypeRegistry,
    );
  }

  /**
   * Called by addAccount() — create and store a live SDK client.
   * `params` is the raw object received by addAccount.
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
  async sendMessage(
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

### What is validated, and when

The `hermes` controller validates `body.params` of `sendMessage` against `sendParamsJsonSchema` before calling your `sendMessage()` method.

`BaseProvider` also exposes `validateAccountParams()`, `validateRecipients()` and `validateContent()`, compiled from the schemas you pass to the constructor, but **the controller does not call them automatically**. Call them yourself at the beginning of `sendMessage()` and `_createAccount()` if you want recipients, content and account credentials to be rejected before reaching the external service:

```typescript
async sendMessage(accountName, recipients, content, params = {}) {
  this.validateContent(content);
  for (const recipient of recipients) {
    this.validateRecipients(recipient); // recipientTypeName can be omitted when only one type is accepted
  }
  // ...
}
```

---

## 3. Register the provider

`acceptedRecipientTypes` must already be known to the registry when the provider is registered — `registerProvider()` throws a `BadRequestError` otherwise. Built-in types (`email`, `phoneNumber`) are registered by the plugin itself; register any custom type first (see below).

The first argument of `registerProvider()` is the **route key** used in the `provider` argument of every API action. It may differ from the display name passed to the `BaseProvider` constructor.

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
POST /_/hermes/providers/my-provider/accounts?account=default
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

A recipient type is a named, reusable JSON Schema describing the shape of **one** recipient entry. Providers reference recipient types by name in `acceptedRecipientTypes` instead of each declaring their own schema — this is what lets the `hermes:listRecipientTypes` action work across every provider.

Nothing forces a recipient to be an address with a `to` key: the schema is free-form. A webhook URL, a message broker topic or a device token are valid recipient types.

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

const kafkaTopicRecipient: RecipientTypeDefinition = {
  name: "kafkaTopic",
  description: "A Kafka topic, optionally with a partition key",
  jsonSchema: {
    type: "object",
    properties: {
      topic: { type: "string", minLength: 1, title: "Topic" },
      key: { type: "string", title: "Partition key" },
    },
    required: ["topic"],
  },
};

const plugin = new HermesMessengerPlugin();

// Must be registered before any provider that lists these names in its
// acceptedRecipientTypes.
plugin.registerRecipientType(webhookUrlRecipient);
plugin.registerRecipientType(kafkaTopicRecipient);
```

A provider accepting `kafkaTopic` would then read `recipient.topic` and `recipient.key` in its `sendMessage()` method instead of `recipient.to`.

Notes:

- Registering the same `name` twice with an identical definition is a no-op; a different definition under an existing name throws.
- `recipientTypeRegistry.get(name)` / `.has(name)` / `.list()` are available wherever the registry is passed (providers, controllers) to look up or enumerate definitions at runtime.
- `hermes:listRecipientTypes` (`GET /_/hermes/recipient-types`) exposes every registered `RecipientTypeDefinition` over the API.
- When a provider accepts **several** recipient types, `validateRecipients(recipient, recipientTypeName)` needs the type name to know which schema to apply. The API request body has no field for it today, so a multi-type provider must infer the type from the recipient shape itself.

---

## BaseProvider API reference

| Method                                              | Description                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addAccount(name, params)`                          | Register an account; triggers cluster sync                                                                                                                                                                   |
| `removeAccount(name)`                               | Remove a registered account; triggers cluster sync                                                                                                                                                           |
| `getAccount(name)`                                  | Retrieve a registered account (throws `NotFoundError` if not found)                                                                                                                                          |
| `listAccounts()`                                    | Returns `[{ name, options }]` for all accounts                                                                                                                                                               |
| `getName()`                                         | Returns the provider display name                                                                                                                                                                            |
| `getAcceptedRecipientTypes()`                       | Returns the `recipientType` names this provider accepts                                                                                                                                                      |
| `getAccountParamsJsonSchema()`                      | Returns the account `paramsJsonSchema`                                                                                                                                                                       |
| `validateAccountParams(params)`                     | Validate against the account `paramsJsonSchema` (not called automatically)                                                                                                                                   |
| `validateRecipients(recipient, recipientTypeName?)` | Validate **one** recipient against the named type's schema; if the provider accepts only one type, `recipientTypeName` can be omitted (not called automatically)                                             |
| `validateContent(content)`                          | Validate against `contentJsonSchema` (not called automatically)                                                                                                                                              |
| `validateSendParams(params)`                        | Validate against `sendParamsJsonSchema` (called by the controller before `sendMessage()`)                                                                                                                           |
| `serialize()`                                       | Returns a `SerializedProvider` (`name`, `capabilities`, `acceptedRecipientTypes`, `paramsJsonSchema`, `contentJsonSchema`, `sendParamsJsonSchema`) — what `hermes:listProviders` returns for each provider |

### Abstract members to implement

| Member                                          | Description                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `sendMessage(account, recipients, content, params?)` | Deliver the message                                                         |
| `_createAccount(name, params)`                  | Build the in-memory account (`{ name, provider, options }`) from `params`   |

### Public properties

| Property       | Description                                                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities` | A `ProviderCapabilities` object declaring what this provider supports — `fileAttachment`, `shortMessage`, `longMessage`, `json` (all default `false`). Exposed via `serialize()` so `hermes:listProviders` can be filtered by capability. |

### Protected properties available once the plugin is initialized

| Property       | Description                              |
| -------------- | ---------------------------------------- |
| `this.context` | Kuzzle plugin context                    |
| `this.config`  | Plugin configuration (e.g. `adminIndex`) |
| `this.sdk`     | Kuzzle embedded SDK shortcut             |
| `this.cluster` | Kuzzle cluster accessor                  |
