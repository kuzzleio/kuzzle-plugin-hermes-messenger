---
type: page
code: true
title: sendTemplatedEmail
description: Send a templated email with a Sendgrid account
---

# sendTemplatedEmail

Sends a templated email using one of the registered Sendgrid accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/sendgrid/templated-email/:templateId
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/sendgrid",
  "action": "sendTemplatedEmail",
  "account": "<account name>",
  "body": {
    "from": "<sender email>",
    "to": ["<recipient1 email>", "<recipient2 email>"],
    "templateData": {
      // Template placeholders values
    },
  }
}
```

### Kourou

```bash
kourou hermes/sendgrid:sendTemplatedEmail -a account=<account name> -a templateId=<template id>--body '{
  "from": "<sender email>",
  "to": ["<recipient1 email>", "<recipient2 email>"],
  "templateData": {},
}'
```
---
