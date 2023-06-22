---
type: page
code: true
title: listAccounts
description: List SMTP accounts
---

# listAccounts

Lists SMTP accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/smtp/accounts
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes/smtp",
  "action": "listAccounts"
}
```

### Kourou

```bash
kourou hermes/smtp:listAccounts
```

---

## Response

Returns the names of registered accounts.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes/smtp",
  "action": "listAccounts",
  "result": {
  "accounts": [
    {
      "name": "common",
      "options": {
        "defaultSender": "amaret@kuzzle.io"
      }
    },
    {
      "name": "ilayda",
      "options": {
        "defaultSender": "ilayda@gmail.com"
      }
    },
    {
      "name": "aschen",
      "options": {
        "defaultSender": "aschen@gmail.com"
      }
    }
  ]
}

}
```
