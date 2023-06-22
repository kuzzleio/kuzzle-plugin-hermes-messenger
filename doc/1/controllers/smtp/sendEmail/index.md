---
type: page
code: true
title: sendEmail
description: Send an email with a SMTP account
---

# sendEmail

Sends an email using one of the registered SMTP accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/smtp/email
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes/smtp",
  "action": "sendEmail",
  "account": "<account name>",
  "body": {
    "to": ["<recipient1 email>", "<recipient2 email>"],
    "subject": "<email subject>",
    "html": "<email body>",
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
kourou hermes/smtp:sendEmail -a account=<account name> --body '{
  "from": "<sender email>",
  "to": ["<recipient1 email>", "<recipient2 email>"],
  "subject": "<email subject>",
  "html": "<email body>",
  "attachments": [
    {
      "content": "<base64 encoded attachment content>"",
      "contentType": "<attachment content type>",
      "filename": "<attachment file name>",
      "contentDisposition": "attachment" | "inline",
      "cid": "<content ID if inline attachment>"
    }
  ]
}'
```

---
