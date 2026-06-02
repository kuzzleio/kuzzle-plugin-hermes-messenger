---
code: false
type: page
title: Overview
description: Overview of the Hermes Messenger plugin features and main concepts
order: 100
---

# Hermes Messenger

This plugin gives the application the ability to send various types of messages (SMS, email) using external providers.

Available SMS providers:
  - Twilio *(coming soon)*

Available email providers:
  - SMTP (built-in)
  - Sendgrid *(coming soon)*

## Architecture

Providers are built around the `BaseProvider<T>` abstract class. The plugin exposes a unified `hermes` controller with actions that work the same way for every provider:

| Action | HTTP |
|---|---|
| `addAccount` | `POST /_/hermes/providers/:provider/accounts` |
| `removeAccount` | `DELETE /_/hermes/providers/:provider/accounts/:account` |
| `listAccounts` | `GET /_/hermes/providers/:provider/accounts` |
| `send` | `POST /_/hermes/providers/:provider/accounts/:account` |

## Accounts Management

Each provider supports multiple named accounts with different credentials. The following API actions manage accounts:

- [`hermes:addAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/add-account)
- [`hermes:removeAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/remove-account)
- [`hermes:listAccounts`](/official-plugins/hermes-messenger/2/controllers/smtp/list-accounts)

### Register an account at startup

Accounts can be added programmatically after the application has started using `getProvider().addAccount()`.

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';

const hermesMessengerPlugin = new HermesMessengerPlugin();
app.plugin.use(hermesMessengerPlugin);

app.start()
  .then(() => {
    // SMTP is built-in — no registerProvider() needed
    hermesMessengerPlugin.getProvider('smtp').addAccount(
      'common',
      'smtp.example.com',
      587,
      'user@example.com',
      'secret',
      'no-reply@example.com'
    );
  })
  .catch(console.error);
```

### Register a custom provider

Custom providers can be registered before the application starts:

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';
import { MyCustomProvider } from './providers/MyCustomProvider';

const hermesMessengerPlugin = new HermesMessengerPlugin();
hermesMessengerPlugin.registerProvider('my-provider', new MyCustomProvider());
app.plugin.use(hermesMessengerPlugin);
```

See the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider) for details on implementing your own provider.
