@{%
import { Prisma } from '@prisma/client';
import {
  addDays,
  addMonths,
  addYears,
  parse,
  startOfDay,
} from 'date-fns';
import moo from 'moo';

type DateTimeFilter = Prisma.DateTimeFilter;
type TrackWhereInput = Prisma.TrackWhereInput;

const addFuncs = {
  d: addDays,
  m: addMonths,
  y: addYears,
};
type Unit = 'd' | 'm' | 'y';

// Generate a comparison query between an absolute date in a given unit
// makeAbsoluteComparison('=', new Date(2020, 1, 1), 'd') means "dates on the same day as 1/1/2020"
// makeAbsoluteComparison('=', new Date(2020, 1, 1), 'y') means "dates in the same year as 1/1/2020"
// makeAbsoluteComparison('>', new Date(2020, 1, 1), 'y') means "dates after 1/1/2020"
// makeAbsoluteComparison('<=', new Date(2020, 1, 1), 'y') means "dates before or on 1/1/2020"
function makeAbsoluteComparison(operator: string, date: Date, unit: Unit): DateTimeFilter {
  // Determine the next day/month/year based on the given unit
  const addFunc = addFuncs[unit];
  const next = addFunc(date, 1);
  if (operator === '=') {
    // The model equals the date if it falls between the date and the next day/month/year
    return { gte: date, lt: next };
  } else if (operator === '<') {
    return { lt: date };
  } else if (operator === '<=') {
    return { lt: next };
  } else if (operator === '>') {
    return { gte: next };
  } else if (operator === '>=') {
    return { gte: date };
  } else {
    throw new Error('Invalid operator');
  }
}

// Generate a comparison query a certain distance before now
// makeRelativeComparison('=', 3, 'd') means "dates between 2 and 4 days before now"
// makeRelativeComparison('=', 3, 'm') means "dates between 2 and 4 months before now"
// makeRelativeComparison('>', 3, 'd') means "dates more than 3 days before now"
// makeRelativeComparison('<=', 3, 'y') means "dates 3 or fewer years before now"
function makeRelativeComparison(operator: string, amount: number, unit: Unit): DateTimeFilter {
  const addFunc = addFuncs[unit];
  const now = new Date();
  if (operator === '=') {
    return { gt: addFunc(now, -amount - 1), lt: addFunc(now, -amount + 1) };
  } else if (operator === '<') {
    return { gt: addFunc(now, -amount) };
  } else if (operator === '<=') {
    return { gte: addFunc(now, -amount) };
  } else if (operator === '>') {
    return { lt: addFunc(now, -amount) };
  } else if (operator === '>=') {
    return { lte: addFunc(now, -amount) };
  } else {
    throw new Error('Invalid operator');
  }
}

const lexer = moo.compile({
  ws: / +/,
  number: { match: /[1-9]\d*/, value: (v: string) => parseInt(v, 10) },
  quotedString: { match: /\".+?\"/, value: (v: string) => v.slice(1, -1) },
  dateUnit: ['d', 'm', 'y'],

  cleanKw: 'clean',
  explicitKw: 'explicit',
  unlabeledKw: 'unlabeled',
  addedKw: 'added',
  releasedKw: 'released',

  labelKw: 'label:',
  albumKw: 'album:',
  artistKw: 'artist:',

  dash: '-',
  comparison: ['<=', '>=', '<', '>', '='],
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
relativeDate -> %number %dateUnit {% ([amount, unit]) => ({ amount: amount.value, unit: unit.value }) %}
absoluteDate -> %number {% ([year]) => ({ unit: 'y', date: new Date(year.value, 0, 1) }) %}
              | %number %dash %number %dash %number {% ([month, _a, day, _b, year]) => ({ unit: 'd', date: new Date(year.value, month.value - 1, day.value) }) %}
added -> %addedKw %comparison absoluteDate {% ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeAbsoluteComparison(operator.value, date.date, date.unit) }) %}
       | %addedKw %comparison relativeDate {% ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeRelativeComparison(operator.value, date.amount, date.unit)}) %}
released -> %releasedKw %comparison absoluteDate {% ([_, operator, date]): TrackWhereInput => ({ album: { dateReleased: makeAbsoluteComparison(operator.value, date.date, date.unit) } }) %}
          | %releasedKw %comparison relativeDate {% ([_, operator, date]): TrackWhereInput => ({ album: { dateReleased: makeRelativeComparison(operator.value, date.amount, date.unit) } }) %}
value -> %cleanKw {% (_): TrackWhereInput => ({ explicit: false }) %}
       | %explicitKw {% (_): TrackWhereInput => ({ explicit: true }) %}
       | %unlabeledKw {% (_): TrackWhereInput => ({ labels: { none: {} } }) %}
       | %labelKw %number {% ([_, id]): TrackWhereInput => ({ labels: { some: { id: id.value } } }) %}
       | %albumKw %quotedString {% ([_, name]: [unknown, string]): TrackWhereInput => ({ album: { name: name.value } }) %}
       | %artistKw %quotedString {% ([_, name]: [unknown, string]): TrackWhereInput => ({ artists: { some: { name: name.value } } }) %}
       | added {% id %}
       | released {% id %}
parentheses -> %lparen binary %rparen {% ([_, inner]) => inner %}
             | value {% id %}
unary -> %not parentheses {% ([ _, rhs ]: [unknown, TrackWhereInput]): TrackWhereInput => ({ NOT: rhs }) %}
       | parentheses {% id %}
binary -> binary %ws %and %ws unary {% ([lhs, _a, _b, _c, rhs]: [TrackWhereInput, unknown, unknown, unknown, TrackWhereInput]): TrackWhereInput => ({ AND: [lhs, rhs] }) %}
        | binary %ws %or %ws unary {% ([lhs, _a, _b, _c, rhs]: [TrackWhereInput, unknown, unknown, unknown, TrackWhereInput]): TrackWhereInput => ({ OR: [lhs, rhs] }) %}
        | unary {% id %}
ws -> %ws
