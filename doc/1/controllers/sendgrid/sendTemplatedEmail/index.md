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
URL: http://kuzzle:7512/_/hermes/sendgrid/templated-email
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/sendgrid",
  "action": "sendTemplatedEmail",
  "account": "<account name>",
  "body": {
    "to": ["<recipient1 email>", "<recipient2 email>"],
    "templateData": {
      // Template placeholders values
    },
    "templateId": "<template ID>",
    "from": "<sender email>", // optional
    "attachments": [ // optional
      {
        "content": "<base64 encoded attachment content>",
        "contentType": "<attachment content type>",
        "filename": "<attachment file name>",
        "contentDisposition": "attachment" | "inline",
        "cid": "<content ID if inline attachment>" // optional
      }
    ]
  }
}
```

### Kourou

```bash
kourou hermes/sendgrid:sendTemplatedEmail -a account=<account name> --body '{
  "from": "<sender email>",
  "to": ["<recipient1 email>", "<recipient2 email>"],
    "templateId": "<template ID>",
  "templateData": {},
}'
```
---
