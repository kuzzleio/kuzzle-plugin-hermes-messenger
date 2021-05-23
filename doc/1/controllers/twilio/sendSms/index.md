---
type: page
code: true
title: sendSms
description: Send a SMS with a Twilio account
---

# sendSms

Sends a SMS using one of the registered Twilio account.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/twilio/sms
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/twilio",
  "action": "sendSms",
  "account": "<account name>",
  "body": {
    "from": "<twilio phone number>",
    "to": "<recipient phone number>",
    "text": "<sms content>"
  }
}
```

### Kourou

```bash
kourou hermes/twilio:sendSms -a account=<account name> --body '{
  "from": "<twilio phone number>",
  "to": "<recipient phone number>",
  "text": "<sms content>"
}'
```
---