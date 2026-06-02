---
type: page
code: true
title: sendEmail
description: Send an email with a Sendgrid account
---

# sendEmail

Sends an email using one of the registered Sendgrid accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/sendgrid/accounts/:account
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "send",
  "provider": "sendgrid",
  "account": "<account name>",
  "body": {
    "recipients": ["<recipient1 email>", "<recipient2 email>"],
    "content": {
      "subject": "<email subject>",
      "html": "<email body>"
    },
    "params": {
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
}
```

### Kourou

```bash
kourou hermes:send -a provider=sendgrid -a account=<account name> --body '{
  "recipients": ["<recipient1 email>", "<recipient2 email>"],
  "content": {
    "subject": "<email subject>",
    "html": "<email body>"
  },
  "params": {}
}'
```
---
