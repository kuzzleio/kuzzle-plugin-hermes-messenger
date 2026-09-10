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

| `providerId` | `displayName` | Channel | Recipient type |
| ------------ | ------------- | ------- | -------------- |
| `smtp`       | `SMTP`        | email   | `email`        |
| `sendgrid`   | `SendGrid`    | email   | `email`        |
| `twilio`     | `Twilio`      | SMS     | `phoneNumber`  |
| `smsenvoi`   | `SMS Envoi`   | SMS     | `phoneNumber`  |

The **`providerId`** is the value to pass in the `providerId` argument of every account action and the key of the routes. The **`displayName`** is a label for user interfaces. Both are returned by [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers). Accounts follow the same pattern: an `accountId` used in arguments and routes, and an optional `displayName`.

Coming from version 1? Read the [Migration guide](/official-plugins/hermes-messenger/2/guides/migration).

## Concepts

- **Provider**: an integration with an external messaging service, implemented by extending `BaseProvider<T>`. A provider declares its capabilities, the recipient types it accepts and three JSON Schemas.
- **Account**: a set of credentials registered on a provider under a name. Several accounts can coexist on the same provider (e.g. one per customer). Accounts are kept in memory and synchronized across cluster nodes.
- **Recipient type**: a named JSON Schema describing one recipient string. Recipients are always plain strings; delivery options such as `cc` or `bcc` are provider `params`. Recipient types are shared between providers through a registry, see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types). Three are built in:

  | Name          | Format                    | Audiences   |
  | ------------- | ------------------------- | ----------- |
  | `email`       | string, `format: "email"` | `human`     |
  | `phoneNumber` | string, E.164 pattern     | `human`     |
  | `uri`         | string, `format: "uri"`   | `technical` |

- **Audience**: each recipient type lists the audiences it is meant for. `human` recipients designate a person (email, phone number), `technical` ones a resource (webhook URI, broker topic, bucket). `listRecipientTypes`, `listProviders` and `listAccounts` accept an `audience` argument (one value or an array), so an application can offer only human oriented channels when editing a user's contacts.
- **Capabilities**: what a provider can carry in a message, as an array of strings. Well-known values: `text` (short plain text), `html` (rich content), `json` (structured payload), `file` (attachments or file transfer). Used to filter providers in `listProviders` with the `capability` argument.
- **JSON Schemas**: `accountParamsSchema` (account credentials for `addAccount`), `messageContentSchema` (the `content` object of `sendMessage`), `messageAdditionalParamsSchema` (the `params` object of `sendMessage`). They are returned by `listProviders` so clients can generate forms dynamically.

## API

The plugin exposes a single `hermes` controller. Account and message actions take the `providerId` and `accountId` arguments and work the same way for every provider:

| Action               | HTTP                                                     | Description                                                                        |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `listProviders`      | `GET /_/hermes/providers[?capability=…][&audience=…]`                   | Providers, capabilities, audiences and JSON Schemas                                |
| `listRecipientTypes` | `GET /_/hermes/recipient-types[?audience=…]`             | Registered recipient types and their audiences                                     |
| `addAccount`         | `PUT /_/hermes/providers/:providerId/accounts/:accountId`            | Register an account (`body.params`)                                                |
| `removeAccount`      | `DELETE /_/hermes/providers/:providerId/accounts/:accountId` | Remove an account                                                                  |
| `listAccounts`       | `GET /_/hermes/accounts[?providerId=…][&audience=…][&capability=…]`       | Accounts of every provider (or of one), with their provider key, recipient types, audiences and capabilities |
| `sendMessage`        | `POST /_/hermes/providers/:providerId/accounts/:accountId`   | Send a message (`body.recipients`, `body.content`, `body.params`)                  |

The `sendMessage` body always has the same three parts:

```js
{
  "recipients": [ /* strings, each matching one of the provider's recipient types */ ],
  "content":    { /* matches the provider's messageContentSchema */ },
  "params":     { /* optional, matches the provider's messageAdditionalParamsSchema */ }
}
```

Per-provider examples: [SMTP](/official-plugins/hermes-messenger/2/controllers/smtp/send-message), [Sendgrid](/official-plugins/hermes-messenger/2/controllers/sendgrid/send-message), [Twilio](/official-plugins/hermes-messenger/2/controllers/twilio/send-message), [SMS Envoi](/official-plugins/hermes-messenger/2/controllers/smsenvoi/send-message).

## Accounts Management

Each provider supports multiple named accounts with different credentials. The following API actions manage accounts:

- [`hermes:addAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/add-account)
- [`hermes:removeAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/remove-account)
- [`hermes:listAccounts`](/official-plugins/hermes-messenger/2/controllers/hermes/list-accounts) (all providers, or one with the `providerId` argument)

### Register an account at startup

Accounts can be added programmatically once the application has started, using `getProvider(providerId).addAccount(accountId, params, displayName?)`. `params` must match the provider's `accountParamsSchema`.

```js
import { HermesMessengerPlugin } from "kuzzle-plugin-hermes-messenger";

const hermesMessengerPlugin = new HermesMessengerPlugin();
app.plugin.use(hermesMessengerPlugin);

app
  .start()
  .then(() => {
    hermesMessengerPlugin.getProvider("smtp").addAccount("common", {
      host_name: "smtp.example.com",
      port: 587,
      user: "user@example.com",
      password: "secret",
      default_sender: "no-reply@example.com",
    });

    hermesMessengerPlugin.getProvider("twilio").addAccount("common", {
      account_sid: "ACxxxxxxxx",
      auth_token: "secret",
      default_sender: "+33600000000",
    });
  })
  .catch(console.error);
```

### Register a custom provider

Custom providers and custom recipient types must be registered before the application starts:

```js
import { HermesMessengerPlugin } from "kuzzle-plugin-hermes-messenger";
import { MyCustomProvider } from "./providers/MyCustomProvider";

const hermesMessengerPlugin = new HermesMessengerPlugin();
hermesMessengerPlugin.registerProvider("my-provider", new MyCustomProvider());
app.plugin.use(hermesMessengerPlugin);
```

See the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider) for details on implementing your own provider and recipient types.
