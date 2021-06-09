Feature: Sendgrid Client

  Scenario: Register an account and send an email
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
    When I successfully execute the action "hermes/sendgrid":"sendEmail" with args:
      | account      | "ilayda"            |
      | body.from    | "support@kuzzle.io" |
      | body.to      | ["jobs@kuzzle.io"]  |
      | body.subject | "Merhaba"           |
      | body.html    | "<div> body </div>" |
    Then I successfully execute the action "tests":"verifySendSendgrid" with args:
      | account      | "ilayda"            |
      | body.from    | "support@kuzzle.io" |
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

  Scenario: List accounts
    Given I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "ilayda" |
    And I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "water-fairy" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "ilayda" |
      | body.apiKey | "apiKey" |
    Given I successfully execute the action "hermes/sendgrid":"addAccount" with args:
      | account     | "water-fairy" |
      | body.apiKey | "apiKey"      |
    When I successfully execute the action "hermes/sendgrid":"listAccounts"
    Then I should receive a result matching:
      | accounts | ["common", "ilayda", "water-fairy"] |
    When I execute the action "hermes/sendgrid":"removeAccount" with args:
      | account | "water-fairy" |
    And I successfully execute the action "hermes/sendgrid":"listAccounts"
    Then I should receive a result matching:
      | accounts | ["common", "ilayda"] |

