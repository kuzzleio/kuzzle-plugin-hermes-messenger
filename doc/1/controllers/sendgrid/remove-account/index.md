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
URL: http://kuzzle:7512/_/hermes/sendgrid/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes/sendgrid",
  "action": "removeAccount",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes/sendgrid:removeAccount -a account=<account name>
```
---