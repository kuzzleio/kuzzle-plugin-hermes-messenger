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
URL: http://kuzzle:7512/_/hermes/providers/sendgrid/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "removeAccount",
  "provider": "sendgrid",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes:removeAccount -a provider=sendgrid -a account=<account name>
```

---
