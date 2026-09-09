---
code: false
type: page
title: Migration from v1
description: How to migrate an application from Hermes Messenger 1.x to 2.x
order: 300
---

# Migration from v1

Version 2 is a breaking release. The per-provider controllers of version 1 (`hermes/twilio`, `hermes/sendgrid`, `hermes/smtp`, `hermes/smsenvoi`) are replaced by a single `hermes` controller, and every request body changes shape.

## Prerequisites

- `kuzzle >= 2.50.0` (peer dependency).

## Routes and actions

| v1                                                                                 | v2                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hermes/twilio:sendSms` — `POST /_/hermes/twilio/sms`                              | `hermes:sendMessage` with `provider=twilio` — `POST /_/hermes/providers/twilio/accounts/:name`                                                          |
| `hermes/smsenvoi:sendSms`                                                          | `hermes:sendMessage` with `provider=smsenvoi`                                                                                                              |
| `hermes/sendgrid:sendEmail` — `POST /_/hermes/sendgrid/email`                      | `hermes:sendMessage` with `provider=sendgrid`                                                                                                              |
| `hermes/sendgrid:sendTemplatedEmail`                                               | **Removed**, see below                                                                                                                                     |
| `hermes/smtp:sendEmail`                                                            | `hermes:sendMessage` with `provider=smtp`                                                                                                                  |
| `hermes/<provider>:addAccount` — `POST /_/hermes/<provider>/accounts`              | `hermes:addAccount` — `PUT /_/hermes/providers/:provider/accounts/:name`                                                                                        |
| `hermes/<provider>:removeAccount` — `DELETE /_/hermes/<provider>/account/:account` | `hermes:removeAccount` — `DELETE /_/hermes/providers/:provider/accounts/:name`                                                                          |
| `hermes/<provider>:listAccounts` — `GET /_/hermes/<provider>/accounts`             | `hermes:listAccounts` — `GET /_/hermes/accounts`; lists the accounts of **every** provider unless `provider` is given, each entry carries a `provider` key |
| —                                                                                  | `hermes:listProviders` — `GET /_/hermes/providers` (new)                                                                                                   |
| —                                                                                  | `hermes:listRecipientTypes` — `GET /_/hermes/recipient-types` (new)                                                                                        |

Rights: replace `hermes/twilio`, `hermes/sendgrid`, ... controller rights with rights on the `hermes` controller.

## `addAccount` body

In v1 the account name was passed as the `account` argument and credentials were top-level body properties in camelCase. In v2 the account name is passed as the `name` argument (in the URL path over HTTP, for `addAccount`, `removeAccount` and `sendMessage` alike), and credentials move under `body.params`, in snake_case, matching the provider's `accountParamsSchema` (exposed by `hermes:listProviders`).

| Provider  | v1 body                                         | v2 `body.params`                                          |
| --------- | ----------------------------------------------- | --------------------------------------------------------- |
| Twilio    | `accountSid`, `authToken`, `defaultSender`      | `account_sid`, `auth_token`, `default_sender`             |
| SMS Envoi | `userKey`, `accessToken`, `defaultSender`       | `user_key`, `access_token`, `default_sender`              |
| Sendgrid  | `apiKey`, `defaultSender`                       | `api_key`, `default_sender`                               |
| SMTP      | `host`, `port`, `user`, `pass`, `defaultSender` | `host_name`, `port`, `user`, `password`, `default_sender` |

Before:

```js
{
  "controller": "hermes/twilio",
  "action": "addAccount",
  "account": "common",
  "body": { "accountSid": "AC...", "authToken": "...", "defaultSender": "+33600000000" }
}
```

After:

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "twilio",
  "name": "common",
  "body": {
    "params": { "account_sid": "AC...", "auth_token": "...", "default_sender": "+33600000000" }
  }
}
```

## `sendMessage` body

The v2 body is always split in three parts: `recipients`, `content`, `params`.

| v1 property                       | v2 location                                   |
| --------------------------------- | --------------------------------------------- |
| `to` (string or array of strings) | `recipients`: array of address strings        |
| `text` (SMS, Twilio)              | `content.body`                                |
| `text` (SMS, SMS Envoi)           | `content.message`                             |
| `subject` (email)                 | `content.subject`                             |
| `html` (email)                    | `content.message`                             |
| `from`                            | `params.from`                                 |
| `cc`, `bcc` (email)               | `params.cc`, `params.bcc`                     |
| `attachments` (email)             | `params.attachments` (content base64-encoded) |

Before:

```js
{
  "controller": "hermes/sendgrid",
  "action": "sendEmail",
  "account": "common",
  "body": {
    "to": ["a@example.com", "b@example.com"],
    "subject": "Hello",
    "html": "<p>Hi</p>",
    "from": "no-reply@example.com"
  }
}
```

After:

```js
{
  "controller": "hermes",
  "action": "sendMessage",
  "provider": "sendgrid",
  "name": "common",
  "body": {
    "recipients": ["a@example.com", "b@example.com"],
    "content": { "subject": "Hello", "message": "<p>Hi</p>" },
    "params": { "from": "no-reply@example.com" }
  }
}
```

## Removed features

- **Sendgrid templated emails** (`sendTemplatedEmail`, `templateId`, `templateData`): not available in v2. Render the template on your side and send the result as `content.message`.
- **Mocked accounts** (`mockedAccounts` in the plugin configuration and the `messages` collection): removed from the plugin configuration mapping.
- **Custom provider constructors** no longer receive the `RecipientTypeRegistry`: `super(name, acceptedRecipientTypes, accountParamsSchema, messageContentSchema, messageAdditionalParamsSchema)`. The plugin injects its registry when `registerProvider()` is called, so custom recipient types must be registered before that call.
- **Capabilities** are an array of strings (`text`, `html`, `json`, `file`, or custom values) instead of the `fileAttachment` / `longMessage` / `shortMessage` / `json` booleans, and `listProviders` filters them with the `capability` argument instead of `body.filters`.
- **Account name argument**: `name` replaces `account` on `addAccount`, `removeAccount` and `sendMessage`; over HTTP it is part of the path (`/_/hermes/providers/:provider/accounts/:name`) and `addAccount` is a `PUT`.
- **`addAccount()` validates** `params` against `accountParamsSchema` and refuses invalid accounts with a `MultipleErrorsError`; in v1 nothing was validated and a misconfigured account failed at the first send.
- **Accounts** keep the `params` they were created with instead of a public `options` object: `BaseAccount<TClient, TParams>` is `{ name, provider, params }`, providers read `account.params.default_sender` at send time, `BaseProvider.listAccounts()` returns account names and `hermes:listAccounts` never returns account parameters.
- **Schema naming**: the serialized provider fields are `accountParamsSchema`, `messageContentSchema` and `messageAdditionalParamsSchema`, and the `BaseProvider` API follows the same names: `getAccountParamsSchema()`, `getMessageContentSchema()`, `getMessageAdditionalParamsSchema()`, `validateAccountParams()`, `validateMessageContent()`, `validateMessageAdditionalParams()`.
- **`plugin.clients.<provider>`** (`clients.twilio`, `clients.sendgrid`, ...): replaced by `plugin.getProvider('<route key>')`, which returns the `BaseProvider` instance (`addAccount`, `removeAccount`, `listAccounts`, `sendMessage`).
- Programmatic `addAccount(name, host, port, user, ...)` positional signatures: replaced by `addAccount(name, params)` where `params` matches the provider's `accountParamsSchema`.

## New features worth adopting

- `hermes:listProviders` returns the JSON Schemas of every provider: use them to validate or generate forms client-side.
- `hermes:listRecipientTypes` exposes the recipient formats. Recipients, and the `cc` / `bcc` params of the email providers, are arrays of strings.
- Each recipient type declares its `audiences` (`human` for `email` and `phoneNumber`, `technical` for the new built-in `uri` type). `listRecipientTypes`, `listProviders` and `listAccounts` take an optional `audience` argument (a string or an array of strings) to keep only the channels able to reach a person, or only the technical ones.
- `recipients`, `content` and `params` are now validated by the plugin before the provider is called: an invalid recipient or content is rejected with a 400 listing the offending entries.
- Custom providers and recipient types can be registered, see the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider).
