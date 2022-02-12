// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var lparen: any;
declare var rparen: any;
declare var value: any;
declare var not: any;
declare var ws: any;
declare var and: any;
declare var or: any;

import moo from 'moo';

const lexer = moo.compile({
  ws: / +/,
  value: /clean|explicit|unlabeled|year:\d{4}|label:\d+/,
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
    {"name": "parentheses", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "binary", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": x => x[1]},
    {"name": "parentheses", "symbols": [(lexer.has("value") ? {type: "value"} : value)], "postprocess": x => get => get(x[0].value)},
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
