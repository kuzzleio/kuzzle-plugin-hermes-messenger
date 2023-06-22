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
URL: http://kuzzle:7512/_/hermes/smtp/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes/smtp",
  "action": "removeAccount",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes/smtp:removeAccount -a account=<account name>
```

---
