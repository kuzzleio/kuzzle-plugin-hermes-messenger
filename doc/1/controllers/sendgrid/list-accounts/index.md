---
type: page
code: true
title: listAccounts
description: List Sendgrid accounts
---

# listAccounts

Lists Sendgrid accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/sendgrid/accounts
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes/sendgrid",
  "action": "listAccounts"
}
```

### Kourou

```bash
kourou hermes/sendgrid:listAccounts
```
---

## Response

Returns the names of registered accounts.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes/sendgrid",
  "action": "listAccounts",
  "result": { 
    "accounts": ["ilayda", "aschen", "common"]
  }
}
```