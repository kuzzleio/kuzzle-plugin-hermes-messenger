Feature: Sendgrid Client

  Scenario: Register an account and send an email
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
      | body.defaultSender | "ilayda@gmail.com" |
    When I successfully execute the action "hermes/sendgrid":"sendEmail" with args:
      | account      | "ilayda"            |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Merhaba"           |
      | body.html    | "<div> body </div>" |
    Then I successfully execute the action "tests":"verifySendSendgrid" with args:
      | account      | "ilayda"            |
      | body.from    | "ilayda@gmail.com" |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Merhaba"           |
      | body.html    | "<div> body </div>" |
    When I successfully execute the action "hermes/sendgrid":"sendEmail" with args:
      | account      | "common"            |
      | body.from    | "support@kuzzle.io" |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Alo"               |
      | body.html    | "<div> body </div>" |
    Then I successfully execute the action "tests":"verifySendSendgrid" with args:
      | account      | "common"            |
      | body.from    | "support@kuzzle.io" |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Alo"               |
      | body.html    | "<div> body </div>" |

  Scenario: Send a templated email
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
    Then I successfully execute the action "tests":"verifySendSendgrid" with args:
      | account                    | "ilayda"            |
      | body.templateId            | "sales-42"          |
      | body.from                  | "support@kuzzle.io" |
      | body.to                    | ["jobs@kuzzle.io"]  |
      | body.dynamic_template_data | { foo: "bar" }      |

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

