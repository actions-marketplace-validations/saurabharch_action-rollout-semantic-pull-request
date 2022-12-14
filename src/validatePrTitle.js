const { closest } = require("fastest-levenshtein");
const { toBaseForm } = require("verbutils")();
const { TYPES, SCOPES, NO_CHANGELOG, ERRORS, REGEXES } = require("./constants");
const { getAllNodesDisplayNames } = require("./getAllNodesDisplayNames");

/**
 * Validate that a pull request title conforms to rollout semantic conventions.
 *
 *
 */
function validatePrTitle(title) {
  const match = title.match(REGEXES.CONVENTIONAL_SCHEMA);

  // general validation

  if (!match) return [ERRORS.CONVENTIONAL_SCHEMA_MISMATCH];

  if (containsTicketNumber(title)) return [ERRORS.TICKET_NUMBER_PRESENT];

  const issues = [];

  // type validation

  if (!match?.groups?.type) {
    issues.push(ERRORS.TYPE_NOT_FOUND);
  }

  const { type } = match.groups;

  if (isInvalidType(type)) {
    issues.push(ERRORS.INVALID_TYPE);
  }

  // scope validation

  const { scope } = match.groups;

  if (scope && isInvalidScope(scope)) {
    let issue = ERRORS.INVALID_SCOPE;

    if (scope.endsWith(" Node")) {
      issue += `. Did you mean \`${getClosestMatch(scope)} Node\`?`;
    }

    issues.push(issue);
  }

  // subject validation

  const { subject } = match.groups;

  if (startsWithUpperCase(subject)) {
    issues.push(ERRORS.UPPERCASE_INITIAL_IN_SUBJECT);
  }

  if (endsWithPeriod(subject)) {
    issues.push(ERRORS.FINAL_PERIOD_IN_SUBJECT);
  }

  if (doesNotUsePresentTense(subject)) {
    issues.push(ERRORS.NO_PRESENT_TENSE_IN_SUBJECT);
  }

  if (hasSkipChangelog(subject) && skipChangelogIsNotSuffix(subject)) {
    issues.push(ERRORS.SKIP_CHANGELOG_NOT_SUFFIX);
  }

  return issues;
}

/**
 * Helpers
 */

const isInvalidType = (str) => !TYPES.includes(str);

const isInvalidScope = (str) => {
  if (!str) return true;

  return !SCOPES.includes(str) && !isValidNodeScope(str);
};

const isValidNodeScope = (str) =>
  getAllNodesDisplayNames().some((name) => str.startsWith(name)) &&
  str.endsWith(" Node");

const startsWithUpperCase = (str) => /[A-Z]/.test(str.charAt(0));

const endsWithPeriod = (str) => str.charAt(str.length - 1) === ".";

const containsTicketNumber = (str) => REGEXES.TICKET.test(str);

const doesNotUsePresentTense = (str) => {
  const verb = str.split(" ").shift();

  return verb !== toBaseForm(verb);
};

const hasSkipChangelog = (str) => str.includes(NO_CHANGELOG);

const skipChangelogIsNotSuffix = (str) => {
  const suffixPattern = [" ", escapeForRegex(NO_CHANGELOG), "$"].join("");

  return !new RegExp(suffixPattern).test(str);
};

const escapeForRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getClosestMatch = (str) =>
  closest(str.split(" Node").shift(), getAllNodesDisplayNames());

module.exports = { validatePrTitle };
