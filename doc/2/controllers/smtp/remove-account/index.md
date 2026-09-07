---
type: page
code: true
title: removeAccount
description: Delete a SMTP account
---

# removeAccount

Delete a SMTP account.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "removeAccount",
  "provider": "smtp",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes:removeAccount -a provider=smtp -a account=<account name>
```

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "removeAccount",
  "result": null
}
```
