---
type: page
code: true
title: addAccount
description: Add a SMTP account
---

# addAccount

Adds a SMTP account. This account can then be used to send emails.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "smtp",
  "body": {
    "params": {
      "host_name": "<SMTP host>",
      "port": 587,
      "user": "<SMTP user>",
      "password": "<SMTP password>",
      "default_sender": "<default sender email>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a provider=smtp --body '{
  "params": {
    "host_name": "<SMTP host>",
    "port": 587,
    "user": "<SMTP user>",
    "password": "<SMTP password>",
    "default_sender": "<default sender email>"
  }
}'
```

---
