---
type: page
code: true
title: sendMessage
description: Send a message (email) with a Sendgrid account
---

# sendMessage

Sends an email using one of the registered Sendgrid accounts.

The Sendgrid provider accepts the `email` recipient type: each entry of `recipients` is an email address string. Carbon copies go in `params.cc` and `params.bcc`.

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
  "action": "sendMessage",
  "provider": "sendgrid",
  "account": "<account name>",
  "body": {
    "recipients": [
      "<recipient1 email>",
      "<recipient2 email>"
    ],
    "content": {
      "subject": "<email subject>",
      "message": "<email body (HTML)>"
    },
    "params": {
      "from": "<sender email>",  // optional — overrides account default_sender
      "cc": ["<cc email>"],      // optional
      "bcc": ["<bcc email>"],    // optional
      "attachments": [           // optional
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
kourou hermes:sendMessage -a provider=sendgrid -a account=<account name> --body '{
  "recipients": ["<recipient1 email>", "<recipient2 email>"],
  "content": {
    "subject": "<email subject>",
    "message": "<email body>"
  },
  "params": {}
}'
```

---

## Arguments

- `provider`: provider key, `sendgrid`
- `account`: name of a registered Sendgrid account

## Body properties

- `recipients`: array of email address strings (recipient type `email`)
- `content.subject`: email subject
- `content.message`: email body, sent as HTML
- `params.from`: sender override (optional)
- `params.cc`, `params.bcc`: arrays of carbon copy email addresses (optional)
- `params.attachments`: base64-encoded attachments (optional)

`params` is validated against the provider's `messageAdditionalParamsSchema`.

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "sendMessage",
  "result": null
}
```
