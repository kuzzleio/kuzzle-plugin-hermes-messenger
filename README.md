# Hermes Messenger 

This Kuzzle plugin gives the application the ability to send messages using various external providers.

Messages can be sent by using the exposed API. (e.g [hermes/twilio:sendSms](https://docs.kuzzle.io/official-plugins/hermes-messenger/1/controllers/twilio/sendSms))

Available providers:
  - Twilio (SMS)
  - Sendgrid (email)

For each provider, accounts can be registered and then used to send messages with.

## Installation

First install the plugin with NPM or Yarn: `npm install kuzzle-plugin-hermes-messenger`

Then in your application you have to instantiate the plugin and register it:

```js
import { HermesMessengerPlugin } from 'kuzzle-plugin-hermes-messenger';
import { Backend } from 'kuzzle';

const app = new Backend('moda-park');

const hermesMessengerPlugin = new HermesMessengerPlugin();

app.plugin.use(hermesMessengerPlugin);

app.start();
```

## Usage

First you need to register an account for the provider you want to use:

```js
await sdk.query({
  controller: 'hermes/twilio',
  action: 'addAccount',

  account: 'ilayda',
  body: {
    accountSid: '<twilio account sid>',
    authToken: '<twilio auth token>',
  }
});
```

Then you can use this account to send messages:

```js
await sdk.query({
  controller: 'hermes/twilio',
  action: 'sendSms',

  account: 'ilayda',
  body: {
    from: '+905312683835',
    to: '+33629951621',
    text: 'Merhaba!',
  }
});
```

## Documentation

### Online

Open [https://docs.kuzzle.io/official-plugins/hermes-messenger/1](https://docs.kuzzle.io/official-plugins/hermes-messenger/1)

### Locally

```bash
npm run doc:prepare
npm run doc:dev
```

Open [http://localhost:8080](http://localhost:8080)
