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
URL: http://kuzzle:7512/_/hermes/twilio/accounts/:account
Method: DELETE
```

### Other protocols

```js
{
  "controller": "hermes/twilio",
  "action": "removeAccount",
  "account": "<account name>"
}
```

### Kourou

```bash
kourou hermes/twilio:removeAccount -a account=<account name>
```
---