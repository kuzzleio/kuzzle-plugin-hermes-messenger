---
type: page
code: true
title: addAccount
description: Add a Sendgrid account
---

# addAccount

Adds a Sendgrid account. This account can then be used to send emails.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/sendgrid/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "sendgrid",
  "body": {
    "params": {
      "apiKey": "<sendgrid api key>",
      "defaultSender": "<default sender email>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a provider=sendgrid --body '{
  "params": {
    "apiKey": "<sendgrid api key>",
    "defaultSender": "<default sender email>"
  }
}'
```
---
