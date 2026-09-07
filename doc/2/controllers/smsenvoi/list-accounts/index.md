---
type: page
code: true
title: listAccounts
description: List SMS Envoi accounts
---

# listAccounts

Lists SMS Envoi accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smsenvoi/accounts
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listAccounts",
  "provider": "smsenvoi"
}
```

### Kourou

```bash
kourou hermes:listAccounts -a provider=smsenvoi
```

---

## Response

Returns the registered accounts with their options.

::: warning
Unlike the other built-in providers, the SMS Envoi provider stores its credentials in the account `options`. The `userKey` and `accessToken` are therefore returned by this action. Restrict the `hermes:listAccounts` right accordingly.
:::

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "listAccounts",
  "result": {
    "accounts": [
      {
        "name": "common",
        "options": {
          "userKey": "<SMS Envoi user key>",
          "accessToken": "<SMS Envoi access token>",
          "defaultSender": "MyCompany"
        }
      }
    ]
  }
}
```
