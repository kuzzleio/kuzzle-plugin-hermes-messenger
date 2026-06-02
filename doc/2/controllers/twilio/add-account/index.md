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
URL: http://kuzzle:7512/_/hermes/providers/twilio/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "twilio",
  "body": {
    "params": {
      "account_sid": "<twilio account sid>",
      "auth_token": "<twilio auth token>",
      "default_sender": "<default sender phone>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a provider=twilio --body '{
  "params": {
    "account_sid": "<twilio account sid>",
    "auth_token": "<twilio auth token>",
    "default_sender": "<default sender phone>"
  }
}'
```
---
