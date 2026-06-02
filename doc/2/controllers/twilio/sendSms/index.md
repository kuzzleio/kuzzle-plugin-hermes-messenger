---
type: page
code: true
title: sendSms
description: Send an SMS with a Twilio account
---

# sendSms

Sends an SMS using one of the registered Twilio accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/twilio/accounts/:account
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "send",
  "provider": "twilio",
  "account": "<account name>",
  "body": {
    "recipients": [{ "to": "<recipient phone number>" }],
    "content": {
      "body": "<sms content>"
    },
    "params": {
      "from": "<twilio phone number>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:send -a provider=twilio -a account=<account name> --body '{
  "recipients": [{ "to": "<recipient phone number>" }],
  "content": {
    "body": "<sms content>"
  },
  "params": {}
}'
```

---
