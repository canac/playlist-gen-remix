// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var addedKw: any;
declare var comparison: any;
declare var absoluteDate: any;
declare var relativeDate: any;
declare var releasedKw: any;
declare var cleanKw: any;
declare var explicitKw: any;
declare var unlabeledKw: any;
declare var labelKw: any;
declare var labelId: any;
declare var artistKw: any;
declare var artistName: any;
declare var lparen: any;
declare var rparen: any;
declare var not: any;
declare var ws: any;
declare var and: any;
declare var or: any;

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

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "main", "symbols": ["binary"], "postprocess": id},
    {"name": "added", "symbols": [(lexer.has("addedKw") ? {type: "addedKw"} : addedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("absoluteDate") ? {type: "absoluteDate"} : absoluteDate)], "postprocess": ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeAbsoluteComparison(operator.value, date.value.date, date.value.unit) })},
    {"name": "added", "symbols": [(lexer.has("addedKw") ? {type: "addedKw"} : addedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("relativeDate") ? {type: "relativeDate"} : relativeDate)], "postprocess": ([_, operator, date]): TrackWhereInput => ({ dateAdded: makeRelativeComparison(operator.value, date.value.amount, date.value.unit)})},
    {"name": "released", "symbols": [(lexer.has("releasedKw") ? {type: "releasedKw"} : releasedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("absoluteDate") ? {type: "absoluteDate"} : absoluteDate)], "postprocess": ([_, operator, date]): TrackWhereInput => ({ dateReleased: makeAbsoluteComparison(operator.value, date.value.date, date.value.unit) })},
    {"name": "released", "symbols": [(lexer.has("releasedKw") ? {type: "releasedKw"} : releasedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("relativeDate") ? {type: "relativeDate"} : relativeDate)], "postprocess": ([_, operator, date]): TrackWhereInput => ({ dateReleased: makeRelativeComparison(operator.value, date.value.amount, date.value.unit)})},
    {"name": "value", "symbols": [(lexer.has("cleanKw") ? {type: "cleanKw"} : cleanKw)], "postprocess": (_): TrackWhereInput => ({ explicit: false })},
    {"name": "value", "symbols": [(lexer.has("explicitKw") ? {type: "explicitKw"} : explicitKw)], "postprocess": (_): TrackWhereInput => ({ explicit: true })},
    {"name": "value", "symbols": [(lexer.has("unlabeledKw") ? {type: "unlabeledKw"} : unlabeledKw)], "postprocess": (_): TrackWhereInput => ({ labels: { none: {} } })},
    {"name": "value", "symbols": [(lexer.has("labelKw") ? {type: "labelKw"} : labelKw), (lexer.has("labelId") ? {type: "labelId"} : labelId)], "postprocess": ([_, labelId]): TrackWhereInput => ({ labels: { some: { id: labelId.value } } })},
    {"name": "value", "symbols": [(lexer.has("artistKw") ? {type: "artistKw"} : artistKw), (lexer.has("artistName") ? {type: "artistName"} : artistName)], "postprocess": ([_, artistName]): TrackWhereInput => ({ artist: { contains: artistName.value } })},
    {"name": "value", "symbols": ["added"], "postprocess": id},
    {"name": "value", "symbols": ["released"], "postprocess": id},
    {"name": "parentheses", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "binary", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([_, inner]) => inner},
    {"name": "parentheses", "symbols": ["value"], "postprocess": id},
    {"name": "unary", "symbols": [(lexer.has("not") ? {type: "not"} : not), "parentheses"], "postprocess": ([ _, rhs ]: [unknown, TrackWhereInput]): TrackWhereInput => ({ NOT: rhs })},
    {"name": "unary", "symbols": ["parentheses"], "postprocess": id},
    {"name": "binary", "symbols": ["binary", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("and") ? {type: "and"} : and), (lexer.has("ws") ? {type: "ws"} : ws), "unary"], "postprocess": ([lhs, _a, _b, _c, rhs]: [TrackWhereInput, unknown, unknown, unknown, TrackWhereInput]): TrackWhereInput => ({ AND: [lhs, rhs] })},
    {"name": "binary", "symbols": ["binary", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("or") ? {type: "or"} : or), (lexer.has("ws") ? {type: "ws"} : ws), "unary"], "postprocess": ([lhs, _a, _b, _c, rhs]: [TrackWhereInput, unknown, unknown, unknown, TrackWhereInput]): TrackWhereInput => ({ OR: [lhs, rhs] })},
    {"name": "binary", "symbols": ["unary"], "postprocess": id},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]}
  ],
  ParserStart: "main",
};

export default grammar;
