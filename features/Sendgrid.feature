Feature: Sendgrid Client

  Scenario: Register an account and send an email
    Given an existing collection "hermes-messenger":"config"
    Given I "update" the document "plugin--hermes-messenger" with content:
      | hermes-messenger.mockedAccounts.sendgrid | ["common", "ilayda", "water-fairy"] |
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
      | body.defaultSender | "ilayda@gmail.com" |
    When I successfully execute the action "hermes/sendgrid":"sendEmail" with args:
      | account      | "ilayda"            |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Merhaba-email"           |
      | body.html    | "<div> body </div>" |
    Then The document "hermes-messenger":"messages":"Merhaba-email" content match:
      | account      | "ilayda"            |
      | from    | "ilayda@gmail.com" |
      | to      | ["jobs@kuzzle.io"]  |
      | subject | "Merhaba-email"           |
      | html    | "<div> body </div>" |
    When I successfully execute the action "hermes/sendgrid":"sendEmail" with args:
      | account      | "common"            |
      | body.from    | "support@kuzzle.io" |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Alo-email"               |
      | body.html    | "<div> body </div>" |
    Then The document "hermes-messenger":"messages":"Alo-email" content match:
      | account      | "common"            |
      | from    | "support@kuzzle.io" |
      | to      | ["jobs@kuzzle.io"]  |
      | subject | "Alo-email"               |
      | html    | "<div> body </div>" |

  Scenario: Send a templated email
    Given an existing collection "hermes-messenger":"config"
    Given I "update" the document "plugin--hermes-messenger" with content:
      | hermes-messenger.mockedAccounts.sendgrid | ["common", "ilayda", "water-fairy"] |
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    And I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
      | body.defaultSender | "ilayda@gmail.com" |
    When I successfully execute the action "hermes/sendgrid":"sendTemplatedEmail" with args:
      | account           | "ilayda"            |
      | body.templateId   | "sales-42"          |
      | body.from         | "support@kuzzle.io" |
      | body.to           | ["jobs@kuzzle.io"]  |
      | body.templateData | { foo: "bar" }      |
    Then The document "hermes-messenger":"messages":"sales-42" content match:
      | account                    | "ilayda"            |
      | templateId            | "sales-42"          |
      | from                  | "support@kuzzle.io" |
      | to                    | ["jobs@kuzzle.io"]  |
      | dynamic_template_data | { foo: "bar" }      |

  Scenario: List accounts
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    And I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "water-fairy" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
      | body.defaultSender | "ilayda@gmail.com" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "water-fairy" |
      | body.apiKey | "apiKey"      |
      | body.defaultSender | "water-fairy@gmail.com" |
    When I successfully execute the action "hermes/sendgrid":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "amaret@kuzzle.io" } |
      | "ilayda" | { defaultSender: "ilayda@gmail.com" } |
      | "water-fairy" | { defaultSender: "water-fairy@gmail.com" } |
    When I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "water-fairy" |
    And I successfully execute the action "hermes/sendgrid":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "amaret@kuzzle.io" } |
      | "ilayda" | { defaultSender: "ilayda@gmail.com" } |

