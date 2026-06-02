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
