# Hermes Messenger

This Kuzzle plugin gives the application the ability to send messages using various external providers.

Messages are sent through a single `hermes` API controller whose actions work the same way for every provider (e.g. [hermes:sendMessage](https://docs.kuzzle.io/official-plugins/hermes-messenger/2/controllers/smtp/send-message)).

Built-in providers:
  - SMTP (email) — route key `smtp`
  - Sendgrid (email) — route key `sendgrid`
  - Twilio (SMS) — route key `twilio`
  - SMS Envoi (SMS) — route key `smsenvoi`

For each provider, named accounts can be registered and then used to send messages.

Custom providers (any messaging service: push, webhook, message broker, ...) can be added by extending `BaseProvider`, see [Custom providers & recipient types](#custom-providers--recipient-types).

## Installation

First install the plugin with NPM or Yarn: `npm install kuzzle-plugin-hermes-messenger`

Requires `kuzzle >= 2.50.0`.

Then in your application you have to instantiate the plugin and register it:

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';
import { Backend } from 'kuzzle';

const app = new Backend('my-app');

const hermesMessengerPlugin = new HermesMessengerPlugin();

app.plugin.use(hermesMessengerPlugin);

app.start();
```

## Usage

First you need to register an account for the provider you want to use. The `params` object must match the provider's account JSON Schema (see `hermes:listProviders`):

```js
await sdk.query({
  controller: 'hermes',
  action: 'addAccount',
  provider: 'twilio',
  body: {
    params: {
      account_sid: '<twilio account sid>',
      auth_token: '<twilio auth token>',
      default_sender: '+33600000000',
    },
  },
});
```

Then you can use this account to send messages. The body always has three parts: `recipients` (entries matching one of the provider's recipient types), `content` (matching the provider's content schema) and optional `params`:

```js
await sdk.query({
  controller: 'hermes',
  action: 'sendMessage',
  provider: 'twilio',
  account: 'ilayda',
  body: {
    recipients: [{ to: '+33629951621' }],
    content: { body: 'Merhaba!' },
    params: { from: '+905312683835' }, // optional
  },
});
```

Discover providers, their capabilities and schemas, and the registered recipient types:

```js
await sdk.query({ controller: 'hermes', action: 'listProviders' });
await sdk.query({ controller: 'hermes', action: 'listRecipientTypes' });
```

## Custom providers & recipient types

Extend `BaseProvider<T>` to integrate any messaging service, and register it before the application starts:

```js
const hermesMessengerPlugin = new HermesMessengerPlugin();

hermesMessengerPlugin.registerRecipientType(myRecipientType); // only if not built-in
hermesMessengerPlugin.registerProvider(
  'my-provider',
  new MyProvider(hermesMessengerPlugin.recipientTypeRegistry),
);

app.plugin.use(hermesMessengerPlugin);
```

See the [Custom Provider guide](https://docs.kuzzle.io/official-plugins/hermes-messenger/2/guides/custom-provider).

## Migrating from version 1

Version 2 replaces the per-provider controllers (`hermes/twilio`, `hermes/sendgrid`, ...) with the single `hermes` controller and changes every request body. See the [Migration guide](https://docs.kuzzle.io/official-plugins/hermes-messenger/2/guides/migration).

## Documentation

### Online

Open [https://docs.kuzzle.io/official-plugins/hermes-messenger/2](https://docs.kuzzle.io/official-plugins/hermes-messenger/2)

### Locally

```bash
npm run doc:prepare
npm run doc:dev
```

Open [http://localhost:8080](http://localhost:8080)
