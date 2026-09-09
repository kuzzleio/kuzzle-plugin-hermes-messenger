---
code: false
type: page
title: Custom Provider
description: How to implement a custom provider using BaseProvider
order: 200
---

# Custom Provider

Hermes Messenger is extensible. Any messaging service can be integrated by extending the `BaseProvider<T>` abstract class exported from the package: an SMS gateway, a push service, a webhook endpoint, a message broker topic, ...

Recipients are always **plain strings**: an email address, a phone number, a topic name, a webhook URL, a device token... Their formats are **shared** across providers: a provider does not define its own recipient schema. Instead it declares which `recipientType`s it accepts (e.g. `email`, `phoneNumber`, or a custom one you register), and the format of each recipient string is described once in the [`RecipientTypeRegistry`](#registering-a-custom-recipient-type). This lets several providers share the same recipient format (e.g. two email providers both accepting `email`). Delivery options that are not a recipient (carbon copies, headers, priority...) belong to `messageAdditionalParamsSchema`.

---

## 1. Define the account type

An account is what is stored in memory for each registered account: its `name`, the live client in `provider`, and the `params` it was created with (the `body.params` of `addAccount`, matching `accountParamsSchema`). `params` typically hold credentials and a default sender; they are read by the provider at send time and are **never** exposed by `listAccounts`, which only returns account names.

```typescript
import { BaseAccount } from "kuzzle-plugin-hermes-messenger";

interface MyAccountParams {
  apiKey: string;
  defaultSender: string;
}

type MyAccount = BaseAccount<MyClient, MyAccountParams>;
```

---

## 2. Implement the provider class

```typescript
import {
  BaseProvider,
  PROVIDER_CAPABILITY_TEXT,
  ProviderCapabilities,
} from "kuzzle-plugin-hermes-messenger";
import { JSONSchema7 } from "json-schema";

export class MyProvider extends BaseProvider<MyAccount> {
  // What this provider can carry in a message — empty by default.
  override capabilities: ProviderCapabilities = [PROVIDER_CAPABILITY_TEXT];

  constructor() {
    // accountParamsSchema: shape of body.params passed to addAccount
    const accountParamsSchema: JSONSchema7 = {
      type: "object",
      properties: {
        apiKey: { type: "string", minLength: 1 },
        defaultSender: { type: "string", minLength: 1 },
      },
      required: ["apiKey", "defaultSender"],
    };

    // messageContentSchema: shape of body.content passed to sendMessage
    const messageContentSchema: JSONSchema7 = {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    };

    // messageAdditionalParamsSchema: shape of the optional body.params passed to sendMessage
    const messageAdditionalParamsSchema: JSONSchema7 = {
      type: "object",
      properties: {
        from: { type: "string" },
      },
    };

    super(
      "my-provider", // display name, returned by listProviders
      ["phoneNumber"], // acceptedRecipientTypes — must be registered on the plugin before registerProvider(), see below
      accountParamsSchema,
      messageContentSchema,
      messageAdditionalParamsSchema,
    );
  }

  /**
   * Called by addAccount() — create the live SDK client and keep the params
   * on the account. `params` is the raw object received by addAccount.
   */
  protected _createAccount(name: string, params: MyAccountParams): MyAccount {
    return {
      name,
      provider: new MyClient(params.apiKey),
      params,
    };
  }

  /**
   * Send a message. `recipients` are strings, each already validated against one
   * of acceptedRecipientTypes' jsonSchema (here: `phoneNumber`, an E.164 string).
   * `content` and `params` are validated against messageContentSchema and
   * messageAdditionalParamsSchema before this method is called.
   */
  async sendMessage(
    accountName: string,
    recipients: string[],
    content: { text: string },
    params: { from?: string } = {},
  ): Promise<void> {
    const account = this.getAccount(accountName);
    const sender = params.from ?? account.params.defaultSender;

    await Promise.all(
      recipients.map((to) =>
        account.provider.send({ to, from: sender, text: content.text }),
      ),
    );
  }
}
```

### What is validated, and when

Before calling your `sendMessage()` method, the `hermes` controller validates the three parts of the request body:

- `body.recipients` with `validateRecipients()`: it must be a non-empty array of strings, and each string must match the JSON Schema of at least one accepted recipient type. The error lists every offending entry with its index.
- `body.content` with `validateMessageContent()` against `messageContentSchema`.
- `body.params` with `validateMessageAdditionalParams()` against `messageAdditionalParamsSchema`.

`validateRecipients()` returns, for each recipient, the name of the recipient type it matched. A provider accepting several types can use it to route each recipient without parsing anything itself:

```typescript
async sendMessage(accountName, recipients, content, params = {}) {
  const types = this.validateRecipients(recipients); // e.g. ["email", "phoneNumber", "email"]
  // ...
}
```

`body.params` of `addAccount` is validated by `BaseProvider.addAccount()` against `accountParamsSchema` before `_createAccount()` is called, so your provider can rely on the shape it declared. An invalid call is refused with a `MultipleErrorsError` listing every violation (`/port must be integer`, `params must have required property 'default_sender'`...) and logged as a warning, without the parameter values. If `_createAccount()` throws (e.g. the SDK refuses the credentials), the error is logged and rethrown, wrapped in a `BadRequestError` unless it already is a Kuzzle error. Nothing is registered nor synchronized to the cluster in either case.

---

## 3. Register the provider

`acceptedRecipientTypes` must already be known to the registry when the provider is registered — `registerProvider()` throws a `BadRequestError` otherwise. Built-in types (`email`, `phoneNumber`, `uri`) are registered by the plugin itself; register any custom type first (see below).

The first argument of `registerProvider()` is the **route key** used in the `provider` argument of every API action. It may differ from the display name passed to the `BaseProvider` constructor.

```typescript
import { HermesMessengerPlugin } from "kuzzle-plugin-hermes-messenger";
import { MyProvider } from "./providers/MyProvider";

const plugin = new HermesMessengerPlugin();

// only needed if 'my-provider' references a recipientType that isn't built in
// plugin.registerRecipientType(myCustomRecipientType);

plugin.registerProvider("my-provider", new MyProvider());
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
PUT /_/hermes/providers/my-provider/accounts/default
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
  "recipients": ["+33600000000"],
  "content": { "text": "Hello!" },
  "params": {}
}
```

---

## Registering a custom recipient type

A recipient type is a named, reusable JSON Schema describing the format of **one** recipient string. Providers reference recipient types by name in `acceptedRecipientTypes` instead of each declaring their own schema — this is what lets the `hermes:listRecipientTypes` action work across every provider.

Nothing forces a recipient to be an address: any string format works. A webhook URL, a message broker topic or a device token are valid recipient types. If a provider needs structured delivery options (a partition key, a priority, a platform), declare them in its `messageAdditionalParamsSchema` rather than in the recipient.

Every definition declares its `audiences`: a non-empty array telling who a recipient of this type designates. Two values are well known and exported as constants, `RECIPIENT_AUDIENCE_HUMAN` (`"human"`: a person) and `RECIPIENT_AUDIENCE_TECHNICAL` (`"technical"`: a resource), but any string is accepted and a type may belong to several audiences. Applications rely on it to show only human oriented channels when editing a user's contacts, see the `audience` argument of `hermes:listRecipientTypes`, `hermes:listProviders` and `hermes:listAccounts`.

The built-in `uri` type (`format: "uri"`, audience `technical`) already covers webhook URLs and `scheme://` addresses of any kind; register a dedicated type only when a stricter format is needed.

```typescript
import {
  RECIPIENT_AUDIENCE_HUMAN,
  RECIPIENT_AUDIENCE_TECHNICAL,
  RecipientTypeDefinition,
  HermesMessengerPlugin,
} from "kuzzle-plugin-hermes-messenger";

const webhookUrlRecipient: RecipientTypeDefinition = {
  name: "webhookUrl", // unique registry key, referenced by acceptedRecipientTypes
  description: "An HTTPS endpoint to POST the message to",
  audiences: [RECIPIENT_AUDIENCE_TECHNICAL],
  jsonSchema: {
    type: "string",
    format: "uri",
    pattern: "^https://",
    title: "Webhook URL",
  },
};

const pushTokenRecipient: RecipientTypeDefinition = {
  name: "pushToken",
  description: "A mobile device push token",
  audiences: [RECIPIENT_AUDIENCE_HUMAN], // a device belongs to a person
  jsonSchema: { type: "string", title: "Push token", minLength: 1 },
};

const kafkaTopicRecipient: RecipientTypeDefinition = {
  name: "kafkaTopic",
  description: "A Kafka topic name",
  audiences: [RECIPIENT_AUDIENCE_TECHNICAL],
  jsonSchema: {
    type: "string",
    title: "Topic",
    pattern: "^[a-zA-Z0-9._-]{1,249}$",
  },
};

const plugin = new HermesMessengerPlugin();

// Must be registered before any provider that lists these names in its
// acceptedRecipientTypes.
plugin.registerRecipientType(webhookUrlRecipient);
plugin.registerRecipientType(pushTokenRecipient);
plugin.registerRecipientType(kafkaTopicRecipient);
```

A provider accepting `kafkaTopic` receives topic names in `recipients`; a partition key, if needed, would be declared in its `messageAdditionalParamsSchema` and read from `params`.

Notes:

- Registering the same `name` twice with an identical definition is a no-op; a different definition under an existing name throws. A definition without a non-empty `audiences` array throws.
- The provider never receives the registry in its constructor. `registerProvider()` injects the plugin's registry into the provider (`bindRecipientTypes()`) and compiles one validator per accepted recipient type at that moment; every accepted type must therefore be registered **before** `registerProvider()` is called, otherwise it throws. Until then, `validateRecipients()` throws.
- `plugin.getRecipientType(name)` / `hasRecipientType(name)` / `listRecipientTypes({ audience? })` look up or enumerate definitions at runtime.
- `hermes:listRecipientTypes` (`GET /_/hermes/recipient-types[?audience=…]`) exposes every registered `RecipientTypeDefinition` over the API.
- When a provider accepts **several** recipient types, each recipient string is matched against the accepted types in declaration order and the first match wins. Keep the formats distinguishable (an email and an E.164 number cannot be confused; two free-form `{ type: "string" }` types can).

---

## BaseProvider API reference

| Method                                    | Description                                                                                                                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addAccount(name, params)`                | Register an account; triggers cluster sync                                                                                                                                                                                             |
| `removeAccount(name)`                     | Remove a registered account; triggers cluster sync                                                                                                                                                                                     |
| `getAccount(name)`                        | Retrieve a registered account (throws `NotFoundError` if not found)                                                                                                                                                                    |
| `listAccounts()`                          | Returns the names of the registered accounts                                                                                                                                                                                           |
| `getName()`                               | Returns the provider display name                                                                                                                                                                                                      |
| `getAcceptedRecipientTypes()`             | Returns the `recipientType` names this provider accepts                                                                                                                                                                                |
| `getAcceptedRecipientTypeDefinitions()`   | Returns the full `RecipientTypeDefinition` of each accepted type (throws before `registerProvider()`)                                                                                                                                  |
| `getAudiences()`                          | Returns the deduplicated union of the `audiences` of the accepted recipient types (throws before `registerProvider()`)                                                                                                                 |
| `acceptsRecipientTypes({ audience? })`    | `true` when at least one accepted recipient type belongs to the audience (a string or an array of strings); used by `listProviders` / `listAccounts` filtering                                                                         |
| `getAccountParamsSchema()`                | Returns `accountParamsSchema`, the JSON Schema of `addAccount` params                                                                                                                                                                  |
| `getMessageContentSchema()`               | Returns `messageContentSchema`, the JSON Schema of `sendMessage` content                                                                                                                                                               |
| `getMessageAdditionalParamsSchema()`      | Returns `messageAdditionalParamsSchema`, the JSON Schema of the optional `sendMessage` params                                                                                                                                          |
| `validateAccountParams(params)`           | Validate against `accountParamsSchema`; called by `addAccount()`, also usable ahead of time                                                                                                                                                                      |
| `validateRecipients(recipients)`          | Validate an array of recipient strings against the accepted recipient types; returns the matched type name of each entry (called by the controller before `sendMessage`)                                                               |
| `validateMessageContent(content)`         | Validate against `messageContentSchema` (called by the controller before `sendMessage`)                                                                                                                                                |
| `validateMessageAdditionalParams(params)` | Validate against `messageAdditionalParamsSchema` (called by the controller before `sendMessage()`)                                                                                                                                     |
| `serialize()`                             | Returns a `SerializedProvider` (`name`, `capabilities`, `acceptedRecipientTypes`, `audiences`, `accountParamsSchema`, `messageContentSchema`, `messageAdditionalParamsSchema`) — what `hermes:listProviders` returns for each provider |

### Abstract members to implement

| Member                                               | Description                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `sendMessage(account, recipients, content, params?)` | Deliver the message                                                       |
| `_createAccount(name, params)`                       | Build the in-memory account (`{ name, provider, params }`) from `params` |

### Public properties

| Property       | Description                                                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities` | Array of strings declaring what this provider can carry in a message. Well-known values, exported as constants: `text` (`PROVIDER_CAPABILITY_TEXT`), `html`, `json`, `file`; add your own if needed. Empty by default. Exposed via `serialize()` so `hermes:listProviders` can be filtered with `capability`. |

### Protected properties available once the plugin is initialized

| Property       | Description                              |
| -------------- | ---------------------------------------- |
| `this.context` | Kuzzle plugin context                    |
| `this.config`  | Plugin configuration (e.g. `adminIndex`) |
| `this.sdk`     | Kuzzle embedded SDK shortcut             |
| `this.cluster` | Kuzzle cluster accessor                  |
