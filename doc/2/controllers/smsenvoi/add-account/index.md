---
type: page
code: true
title: addAccount
description: Add a SMS Envoi account
---

# addAccount

Adds a SMS Envoi account. This account can then be used to send SMS.

The `params` object must match the provider's account JSON Schema (`accountParamsSchema`), exposed by [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers).

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smsenvoi/accounts/:name
Method: PUT
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "smsenvoi",
  "name": "<account name>",
  "body": {
    "params": {
      "user_key": "<SMS Envoi user key>",
      "access_token": "<SMS Envoi access token>",
      "default_sender": "<default sender>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a provider=smsenvoi -a name=<account name> --body '{
  "params": {
    "user_key": "<SMS Envoi user key>",
    "access_token": "<SMS Envoi access token>",
    "default_sender": "<default sender>"
  }
}'
```

---

## Arguments

- `provider`: provider key, `smsenvoi`
- `name`: name to register the account under, unique within the provider

## Body properties

- `params.user_key`: SMS Envoi user key
- `params.access_token`: SMS Envoi access token
- `params.default_sender`: sender used when `params.from` is not provided on `sendMessage`

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
