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

  cleanKw: 'clean',
  explicitKw: 'explicit',
  unlabeledKw: 'unlabeled',
  addedKw: 'added',
  releasedKw: 'released',

  relativeDate: {
    match: /[1-9]\d*[dmy]/,
    value: (v: string) => ({
      unit: v.slice(-1),
      amount: parseInt(v.slice(0, -1), 10),
    }),
  },
  absoluteDate: {
    match: /(?:[1-9]\d?\-[1-9]\d?\-)?\d{4}/,
    value: (v: string) =>
      v.length === 4
        ? {
            unit: 'y',
            date: parse(v, 'yyyy', startOfDay(new Date())),
          }
        : {
            unit: 'd',
            date: parse(v, 'M-d-yyyy', startOfDay(new Date())),
          },
  },

  labelKw: 'label:',
  labelId: { match: /[1-9]\d*/, value: (v: string) => parseInt(v, 10) },

  artistKw: 'artist:',
  artistName: { match: /\".+?\"/, value: (v: string) => v.slice(1, -1) },

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
added -> %addedKw %comparison %absoluteDate {% ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeAbsoluteComparison(operator.value, date.value.date, date.value.unit) }) %}
       | %addedKw %comparison %relativeDate {% ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeRelativeComparison(operator.value, date.value.amount, date.value.unit)}) %}
released -> %releasedKw %comparison %absoluteDate {% ([_, operator, date]): TrackWhereInput => ({ dateReleased: makeAbsoluteComparison(operator.value, date.value.date, date.value.unit) }) %}
          | %releasedKw %comparison %relativeDate {% ([_, operator, date]): TrackWhereInput => ({ dateReleased: makeRelativeComparison(operator.value, date.value.amount, date.value.unit)}) %}
value -> %cleanKw {% (_): TrackWhereInput => ({ explicit: false }) %}
       | %explicitKw {% (_): TrackWhereInput => ({ explicit: true }) %}
       | %unlabeledKw {% (_): TrackWhereInput => ({ labels: { none: {} } }) %}
       | %labelKw %labelId {% ([_, labelId]): TrackWhereInput => ({ labels: { some: { id: labelId.value } } }) %}
       | %artistKw %artistName {% ([_, artistName]): TrackWhereInput => ({ artist: { contains: artistName.value } }) %}
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
