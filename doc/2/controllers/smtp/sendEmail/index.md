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
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts/:account
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "send",
  "provider": "smtp",
  "account": "<account name>",
  "body": {
    "recipients": [
      {
        "to": "<recipient email>",
        "cc": "<cc email>",  // optional
        "bcc": "<bcc email>" // optional
      }
    ],
    "content": {
      "subject": "<email subject>",
      "message": "<email body (HTML)>"
    },
    "params": {
      "from": "<sender email>", // optional — overrides account default_sender
      "attachments": [          // optional
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
kourou hermes:send -a provider=smtp -a account=<account name> --body '{
  "recipients": [{ "to": "<recipient email>" }],
  "content": {
    "subject": "<email subject>",
    "message": "<email body>"
  },
  "params": {}
}'
```

---
