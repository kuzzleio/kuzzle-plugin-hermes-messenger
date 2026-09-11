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
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts/:accountId
Method: PUT
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "providerId": "smtp",
  "accountId": "<account id>",
  "body": {
    "displayName": "<label>",   // optional
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
kourou hermes:addAccount -a providerId=smtp -a accountId=<account id> --body '{
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

## Arguments

- `providerId`: provider identifier, `smtp`
- `accountId`: identifier to register the account under, unique within the provider

## Body properties

- `displayName` (optional): label for user interfaces; defaults to `accountId`
- `params.host_name`: SMTP server host
- `params.port`: SMTP port (465 enables TLS)
- `params.user`, `params.password`: SMTP credentials
- `params.default_sender`: email address used as sender when `params.from` is not provided on `sendMessage`

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "addAccount",
  "result": null
}
```
