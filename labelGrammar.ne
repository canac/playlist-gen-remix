@{%
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  getYear,
  parse,
  startOfDay,
} from 'date-fns';
import moo from 'moo';

const differenceFuncs = new Map([
  ['d', differenceInDays],
  ['m', differenceInMonths],
  ['y', differenceInYears],
]);

const lexer = moo.compile({
  ws: / +/,

  cleanKw: 'clean',
  explicitKw: 'explicit',
  unlabeledKw: 'unlabeled',
  addedKw: 'added',
  releasedKw: 'released',

  // For both relative and absolute dates, we need a way to extract a number from the left hand side
  // date that will be compared to the right hand side number.
  // compare(extract(lhs), rhs)
  relativeDate: {
    match: /[1-9]\d*[dmy]/,
    value: (v) => ({
      rhs: parseInt(v.slice(0, -1), 10),
      // Extract out how many units in the past the provided date is
      extract: (date) => differenceFuncs.get(v.slice(-1))(Date.now(), date),
    }),
  },
  absoluteDate: {
    match: /(?:[1-9]\d?\-[1-9]\d?\-)?\d{4}/,
    value: (v) =>
      v.length === 4
        ? {
            // Compare the rhs and lhs only by their year, ignoring month and day
            rhs: parseInt(v, 10),
            extract: (date) => getYear(date),
          }
        : {
            // Compare the rhs and lhs only by their date, ignore time of day
            rhs: parse(v, 'M-d-yyyy', startOfDay(new Date()).getTime()),
            extract: (date) => startOfDay(date).getTime(),
          },
  },

  labelKw: 'label:',
  labelId: { match: /[1-9]\d*?/, value: (v) => parseInt(v, 10) },

  artistKw: 'artist:',
  artistName: { match: /\".+?\"/, value: (v) => v.slice(1, -1) },

  comparison: [
    { match: '<=', value: () => (l, r) => l <= r },
    { match: '>=', value: () => (l, r) => l >= r },
    { match: '<', value: () => (l, r) => l < r },
    { match: '>', value: () => (l, r) => l > r },
    { match: '=', value: () => (l, r) => l === r },
  ],
  not: '!',
  and: '&&',
  or: '||',
  lparen: '(',
  rparen: ')',
});
%}

@preprocessor typescript

@lexer lexer

main -> binary {% id %}
added -> %addedKw %comparison %absoluteDate {% x => ({ name: 'added', operation: x[1].value, ...x[2].value }) %}
       | %addedKw %comparison %relativeDate {% x => ({ name: 'added', operation: x[1].value, ...x[2].value }) %}
released -> %releasedKw %comparison %absoluteDate {% x => ({ name: 'released', operation: x[1].value, ...x[2].value }) %}
          | %releasedKw %comparison %relativeDate {% x => ({ name: 'released', operation: x[1].value, ...x[2].value }) %}
label -> %labelKw %labelId {% x => ({ name: 'label', labelId: x[1].value }) %}
artist -> %artistKw %artistName {% x => ({ name: 'artist', artistName: x[1].value }) %}
value -> %cleanKw {% x => ({ name: 'clean' }) %}
       | %explicitKw {% x => ({ name: 'explicit' }) %}
       | %unlabeledKw {% x => ({ name: 'unlabeled' }) %}
       | added {% x => x[0] %}
       | released {% x => x[0] %}
       | label {% x => x[0] %}
       | artist {% x => x[0] %}
parentheses -> %lparen binary %rparen {% x => x[1] %}
             | value {% x => get => get(x[0]) %}
unary -> %not parentheses {% x => get => !x[1](get) %}
       | parentheses {% id %}
binary -> binary %ws %and %ws unary {% x => get => x[0](get) && x[4](get) %}
        | binary %ws %or %ws unary {% x => get => x[0](get) || x[4](get) %}
        | unary {% id %}
ws -> %ws {% null %}
