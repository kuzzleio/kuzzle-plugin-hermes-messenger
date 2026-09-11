---
type: page
code: true
title: removeAccount
description: Delete a Sendgrid account
---

# removeAccount

Delete a Sendgrid account.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/sendgrid/accounts/:accountId
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "removeAccount",
  "providerId": "sendgrid",
  "accountId": "<account id>"
}
```

### Kourou

```bash
kourou hermes:removeAccount -a providerId=sendgrid -a accountId=<account id>
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
