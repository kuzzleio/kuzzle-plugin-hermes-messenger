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
URL: http://kuzzle:7512/_/hermes/providers/smtp/accounts
Method: POST
Query: account=<account name>
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "provider": "smtp",
  "account": "<account name>",
  "body": {
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
kourou hermes:addAccount -a provider=smtp -a account=<account name> --body '{
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

- `provider`: provider key, `smtp`
- `account`: name to register the account under (query string over HTTP)

## Body properties

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
