---
type: page
code: true
title: addAccount
description: Add a Twilio account
---

# addAccount

Adds a Twilio account. This account can then be used to send SMS.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/twilio/accounts/:name
Method: PUT
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "twilio",
  "name": "<account name>",
  "body": {
    "params": {
      "account_sid": "<twilio account sid>",
      "auth_token": "<twilio auth token>",
      "default_sender": "<default sender phone>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a provider=twilio -a name=<account name> --body '{
  "params": {
    "account_sid": "<twilio account sid>",
    "auth_token": "<twilio auth token>",
    "default_sender": "<default sender phone>"
  }
}'
```

---

## Arguments

- `provider`: provider key, `twilio`
- `name`: name to register the account under, unique within the provider

## Body properties

- `params.account_sid`: Twilio account SID
- `params.auth_token`: Twilio auth token
- `params.default_sender`: phone number used as sender when `params.from` is not provided on `sendMessage`

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "addAccount",
  "result": null
}
```
