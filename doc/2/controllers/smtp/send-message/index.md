---
type: page
code: true
title: sendMessage
description: Send a message (email) with a SMTP account
---

# sendMessage

Sends an email using one of the registered SMTP accounts.

The SMTP provider accepts the `email` recipient type: each entry of `recipients` is an email address string. Carbon copies go in `params.cc` and `params.bcc`.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts/:accountId
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "sendMessage",
  "providerId": "smtp",
  "accountId": "<account id>",
  "body": {
    "recipients": [
      "<recipient email>"
    ],
    "content": {
      "subject": "<email subject>",
      "message": "<email body>",
      "format": "html"            // optional: "html" (default) or "text"
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
kourou hermes:sendMessage -a providerId=smtp -a accountId=<account id> --body '{
  "recipients": ["<recipient email>"],
  "content": {
    "subject": "<email subject>",
    "message": "<email body>"
  },
  "params": {}
}'
```

---

## Arguments

- `providerId`: provider identifier, `smtp`
- `accountId`: identifier of a registered SMTP account

## Body properties

- `recipients`: array of email address strings (recipient type `email`)
- `content.subject`: email subject
- `content.message`: email body
- `content.format` (optional): `html` (default) to send `message` as HTML, `text` to send it as plain text
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
