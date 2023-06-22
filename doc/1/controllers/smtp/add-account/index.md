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
URL: http://kuzzle:7512/_/hermes/smtp/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/smtp",
  "action": "addAccount",
  "account": "<account name>",
  "body": {
    "host": "<SMTP host>",
    "port": 25,
    "user": "<SMTP user>",
    "pass": "<SMTP pass>",
    "defaultSender": "<default sender email>"
  }
}
```

### Kourou

```bash
kourou hermes/smtp:addAccount -a account=<account name> --body '{
  "host": "<SMTP host>",
  "port": 25,
  "user": "<SMTP user>",
  "pass": "<SMTP pass>",
  "defaultSender": "<default sender email>"
}'
```

---
