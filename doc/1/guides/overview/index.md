---
code: false
type: page
title: Overview
description: Overview of the Hermes Messenger plugin features and main concepts
order: 100
---

# Hermes Messenger

This plugin gives the application the ability to send various types of messages (SMS, email) using external providers.

Available providers SMS providers:
  - Twilio

Available email providers:
  - Sendgrid
  - SMTP

## Accounts Management

It is possible to register differents accounts for each provider. Then API actions used to send messages can be used with different accounts.

In this way, several accounts with differents credentials can be used to send messages.

The following API actions can be used to manipulate accounts for each providers:
  - `hermes/*:addAccount` (e.g. [hermes/twilio:addAccount](/official-plugins/hermes-messenger/1/controllers/twilio/add-account))
  - `hermes/*:removeAccount` (e.g [hermes/twilio:removeAccount](/official-plugins/hermes-messenger/1/controllers/twilio/remove-account))
  - `hermes/*:listAccounts` (e.g [hermes/twilio:listAccounts](/official-plugins/hermes-messenger/1/controllers/twilio/list-accounts))


### Register an account at startup

Accounts can be setup programmaticaly after the application has started by using the `addAccount` method.

Clients are available from getters on the plugin instance.

```js
app.start()
  .then(() => {
    // Add a "common" Twilio account
    hermesMessengerPlugin.clients.twilio.addAccount('common', 'accountSid', 'authToken', '+33629951621');

    // Add a "common" Sendgrid account
    hermesMessengerPlugin.clients.sendgrid.addAccount('common', 'apiKey', 'amaret@kuzzle.io');

    // Add a "common" SMTP account
    hermesMessengerPlugin.clients.smtp.addAccount('common', 'smtp.example.com', 587, 'dummyUser', 'dummyPass', 'amaret@kuzzle.io');

    // Add a "starttls" SMTP account
    hermesMessengerPlugin.clients.smtp.addAccount('starttls', 'smtp.example.com', 587, 'dummyUser', 'dummyPass', 'amaret@kuzzle.io', 'starttls');

    // Add a "ssl" SMTP account
    hermesMessengerPlugin.clients.smtp.addAccount('ssl', 'smtp.example.com', 465, 'dummyUser', 'dummyPass', 'amaret@kuzzle.io', 'ssl');
  })
  .catch(console.error);
```
