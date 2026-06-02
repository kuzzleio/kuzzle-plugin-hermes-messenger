---
type: page
code: true
title: removeAccount
description: Delete a Twilio account
---

# removeAccount

Delete a Twilio account.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/twilio/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "removeAccount",
  "provider": "twilio",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes:removeAccount -a provider=twilio -a account=<account name>
```

---
