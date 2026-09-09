---
type: page
code: true
title: listAccounts
description: List the accounts registered on every provider
---

# listAccounts

Lists registered accounts. By default every account is returned, whatever its provider; the optional `provider` argument restricts the list to one provider, and the optional `audience` argument to the providers able to reach that kind of recipient (`human` or `technical`).

Each entry carries the route key of the provider it belongs to, so the result can be used directly as the `provider` and `account` arguments of [`sendMessage`](/official-plugins/hermes-messenger/2/controllers/smtp/send-message) and [`removeAccount`](/official-plugins/hermes-messenger/2/controllers/smtp/remove-account).

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/accounts[?provider=<provider>][&audience=<audience>[,<audience>]]
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listAccounts",
  "provider": "smtp",     // optional
  "audience": "human"     // optional, a string or an array of strings
}
```

### Kourou

```bash
# every account
kourou hermes:listAccounts

# only SMTP accounts
kourou hermes:listAccounts -a provider=smtp

# only accounts able to notify a person
kourou hermes:listAccounts -a audience=human
```

---

## Arguments

- `provider` (optional): route key of a registered provider (`smtp`, `twilio`, `sendgrid`, `smsenvoi` or a custom provider key). When given, only the accounts of that provider are returned. An unknown provider is an error.
- `audience` (optional): a string or an array of strings (comma separated in HTTP query strings). Only the accounts of providers accepting **at least one** recipient type whose `audiences` include one of these values are returned (see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types)). An unknown audience returns an empty list. Combines with `provider`.

---

## Response

Returns the registered accounts. Each account has:

- `name`: the account name, unique within its provider
- `provider`: the route key of the provider owning the account (`smtp`, `twilio`, `sendgrid`, `smsenvoi` or a custom provider key)
- `audiences`: the audiences the account can address, i.e. those of its provider (union of the `audiences` of its accepted recipient types). Handy to filter accounts client-side without a second request.

The parameters an account was created with (`body.params` of `addAccount`) are **never** returned: they hold credentials.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "listAccounts",
  "result": {
    "accounts": [
      {
        "name": "common",
        "provider": "smtp",
        "audiences": ["human"]
      },
      {
        "name": "ilayda",
        "provider": "smtp",
        "audiences": ["human"]
      },
      {
        "name": "common",
        "provider": "twilio",
        "audiences": ["human"]
      }
    ]
  }
}
```
