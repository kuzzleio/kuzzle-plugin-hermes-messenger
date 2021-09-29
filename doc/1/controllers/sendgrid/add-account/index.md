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
URL: http://kuzzle:7512/_/hermes/sendgrid/accounts
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/sendgrid",
  "action": "addAccount",
  "account": "<account name>",
  "body": {
    "apiKey": "<sendgrid api key>",
    "defaultSender": "<default sender email>"
  }
}
```

### Kourou

```bash
kourou hermes/sendgrid:addAccount -a account=<account name> --body '{
  "apiKey": "<sendgrid api key>",
  "defaultSender": "<default sender email>"
}'
```
---