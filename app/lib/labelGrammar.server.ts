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
declare var labelKw: any;
declare var labelId: any;
declare var artistKw: any;
declare var artistName: any;
declare var cleanKw: any;
declare var explicitKw: any;
declare var unlabeledKw: any;
declare var lparen: any;
declare var rparen: any;
declare var not: any;
declare var ws: any;
declare var and: any;
declare var or: any;

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
    {"name": "added", "symbols": [(lexer.has("addedKw") ? {type: "addedKw"} : addedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("absoluteDate") ? {type: "absoluteDate"} : absoluteDate)], "postprocess": x => ({ name: 'added', operation: x[1].value, ...x[2].value })},
    {"name": "added", "symbols": [(lexer.has("addedKw") ? {type: "addedKw"} : addedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("relativeDate") ? {type: "relativeDate"} : relativeDate)], "postprocess": x => ({ name: 'added', operation: x[1].value, ...x[2].value })},
    {"name": "released", "symbols": [(lexer.has("releasedKw") ? {type: "releasedKw"} : releasedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("absoluteDate") ? {type: "absoluteDate"} : absoluteDate)], "postprocess": x => ({ name: 'released', operation: x[1].value, ...x[2].value })},
    {"name": "released", "symbols": [(lexer.has("releasedKw") ? {type: "releasedKw"} : releasedKw), (lexer.has("comparison") ? {type: "comparison"} : comparison), (lexer.has("relativeDate") ? {type: "relativeDate"} : relativeDate)], "postprocess": x => ({ name: 'released', operation: x[1].value, ...x[2].value })},
    {"name": "label", "symbols": [(lexer.has("labelKw") ? {type: "labelKw"} : labelKw), (lexer.has("labelId") ? {type: "labelId"} : labelId)], "postprocess": x => ({ name: 'label', labelId: x[1].value })},
    {"name": "artist", "symbols": [(lexer.has("artistKw") ? {type: "artistKw"} : artistKw), (lexer.has("artistName") ? {type: "artistName"} : artistName)], "postprocess": x => ({ name: 'artist', artistName: x[1].value })},
    {"name": "value", "symbols": [(lexer.has("cleanKw") ? {type: "cleanKw"} : cleanKw)], "postprocess": x => ({ name: 'clean' })},
    {"name": "value", "symbols": [(lexer.has("explicitKw") ? {type: "explicitKw"} : explicitKw)], "postprocess": x => ({ name: 'explicit' })},
    {"name": "value", "symbols": [(lexer.has("unlabeledKw") ? {type: "unlabeledKw"} : unlabeledKw)], "postprocess": x => ({ name: 'unlabeled' })},
    {"name": "value", "symbols": ["added"], "postprocess": x => x[0]},
    {"name": "value", "symbols": ["released"], "postprocess": x => x[0]},
    {"name": "value", "symbols": ["label"], "postprocess": x => x[0]},
    {"name": "value", "symbols": ["artist"], "postprocess": x => x[0]},
    {"name": "parentheses", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "binary", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": x => x[1]},
    {"name": "parentheses", "symbols": ["value"], "postprocess": x => get => get(x[0])},
    {"name": "unary", "symbols": [(lexer.has("not") ? {type: "not"} : not), "parentheses"], "postprocess": x => get => !x[1](get)},
    {"name": "unary", "symbols": ["parentheses"], "postprocess": id},
    {"name": "binary", "symbols": ["binary", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("and") ? {type: "and"} : and), (lexer.has("ws") ? {type: "ws"} : ws), "unary"], "postprocess": x => get => x[0](get) && x[4](get)},
    {"name": "binary", "symbols": ["binary", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("or") ? {type: "or"} : or), (lexer.has("ws") ? {type: "ws"} : ws), "unary"], "postprocess": x => get => x[0](get) || x[4](get)},
    {"name": "binary", "symbols": ["unary"], "postprocess": id},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": null}
  ],
  ParserStart: "main",
};

export default grammar;
