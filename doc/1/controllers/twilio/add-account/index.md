---
type: page
code: true
title: addAccount
description: Add a Twilio account
---

# addAccount

Adds a Twilio account. This account can then be used to send SMS.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/twilio/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/twilio",
  "action": "addAccount",
  "account": "<account name>",
  "body": {
    "accountSid": "<twilio account sid>",
    "authToken": "<twilio auth token>"
  }
}
```

### Kourou

```bash
kourou hermes/twilio:addAccount -a account=<account name> --body '{
  "accountSid": "<twilio account sid>",
  "authToken": "<twilio auth token>"
}'
```
---