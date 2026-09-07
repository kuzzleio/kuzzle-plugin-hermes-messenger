---
code: false
type: page
title: Overview
description: Overview of the Hermes Messenger plugin features and main concepts
order: 100
---

# Hermes Messenger

This plugin gives the application the ability to send various types of messages (SMS, email, or anything a custom provider can reach) using external providers.

Built-in providers, registered by default:

| Route key  | Display name | Channel | Recipient type |
|------------|--------------|---------|----------------|
| `smtp`     | `smtp`       | email   | `email`        |
| `sendgrid` | `SendGrid`   | email   | `email`        |
| `twilio`   | `twilio`     | SMS     | `phoneNumber`  |
| `smsenvoi` | `SMS Envoi`  | SMS     | `phoneNumber`  |

The **route key** is the value to pass in the `provider` argument of every action. The display name is what [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers) returns in `name`.

Coming from version 1? Read the [Migration guide](/official-plugins/hermes-messenger/2/guides/migration).

## Concepts

- **Provider**: an integration with an external messaging service, implemented by extending `BaseProvider<T>`. A provider declares its capabilities, the recipient types it accepts and three JSON Schemas.
- **Account**: a set of credentials registered on a provider under a name. Several accounts can coexist on the same provider (e.g. one per customer). Accounts are kept in memory and synchronized across cluster nodes.
- **Recipient type**: a named JSON Schema describing one entry of the `recipients` array (e.g. `email` is `{ "to": "<address>" }`). Recipient types are shared between providers through a registry, see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types).
- **Capabilities**: `fileAttachment`, `longMessage`, `shortMessage`, `json`. Used to filter providers in `listProviders`.
- **JSON Schemas**: `paramsJsonSchema` (account credentials for `addAccount`), `contentJsonSchema` (the `content` object of `sendMessage`), `sendParamsJsonSchema` (the `params` object of `sendMessage`). They are returned by `listProviders` so clients can generate forms dynamically.

## API

The plugin exposes a single `hermes` controller. Every action takes the provider route key as the `provider` argument and works the same way for every provider:

| Action | HTTP | Description |
|---|---|---|
| `listProviders` | `GET /_/hermes/providers` | Providers, capabilities and JSON Schemas |
| `listRecipientTypes` | `GET /_/hermes/recipient-types` | Registered recipient types |
| `addAccount` | `POST /_/hermes/providers/:provider/accounts` | Register an account (`body.params`) |
| `removeAccount` | `DELETE /_/hermes/providers/:provider/accounts/:account` | Remove an account |
| `listAccounts` | `GET /_/hermes/providers/:provider/accounts` | List accounts and their public options |
| `sendMessage` | `POST /_/hermes/providers/:provider/accounts/:account` | Send a message (`body.recipients`, `body.content`, `body.params`) |

The `sendMessage` body always has the same three parts:

```js
{
  "recipients": [ /* entries matching one of the provider's recipient types */ ],
  "content":    { /* matches the provider's contentJsonSchema */ },
  "params":     { /* optional, matches the provider's sendParamsJsonSchema */ }
}
```

Per-provider examples: [SMTP](/official-plugins/hermes-messenger/2/controllers/smtp/send-message), [Sendgrid](/official-plugins/hermes-messenger/2/controllers/sendgrid/send-message), [Twilio](/official-plugins/hermes-messenger/2/controllers/twilio/send-message), [SMS Envoi](/official-plugins/hermes-messenger/2/controllers/smsenvoi/send-message).

## Accounts Management

Each provider supports multiple named accounts with different credentials. The following API actions manage accounts:

- [`hermes:addAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/add-account)
- [`hermes:removeAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/remove-account)
- [`hermes:listAccounts`](/official-plugins/hermes-messenger/2/controllers/smtp/list-accounts)

### Register an account at startup

Accounts can be added programmatically once the application has started, using `getProvider(routeKey).addAccount(name, params)`. `params` must match the provider's `paramsJsonSchema`.

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';

const hermesMessengerPlugin = new HermesMessengerPlugin();
app.plugin.use(hermesMessengerPlugin);

app.start()
  .then(() => {
    hermesMessengerPlugin.getProvider('smtp').addAccount('common', {
      host_name: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'secret',
      default_sender: 'no-reply@example.com',
    });

    hermesMessengerPlugin.getProvider('twilio').addAccount('common', {
      account_sid: 'ACxxxxxxxx',
      auth_token: 'secret',
      default_sender: '+33600000000',
    });
  })
  .catch(console.error);
```

### Register a custom provider

Custom providers and custom recipient types must be registered before the application starts:

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';
import { MyCustomProvider } from './providers/MyCustomProvider';

const hermesMessengerPlugin = new HermesMessengerPlugin();
hermesMessengerPlugin.registerProvider(
  'my-provider',
  new MyCustomProvider(hermesMessengerPlugin.recipientTypeRegistry),
);
app.plugin.use(hermesMessengerPlugin);
```

See the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider) for details on implementing your own provider and recipient types.
