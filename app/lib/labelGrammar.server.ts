// Generated automatically for earley-bird, version 0.0.3
// http://github.com/canac/earley-bird
import {
  Grammar,
  Parser,
  RuleSymbol,
  CharsetSymbol,
  LiteralSymbol,
  TesterSymbol,
  TokenSymbol,
} from "@canac/earley-bird";

import { Prisma } from "@prisma/client";
import { addDays, addMonths, addYears, parse, startOfDay } from "date-fns";
import moo from "moo";

type DateTimeFilter = Prisma.DateTimeFilter;
type TrackWhereInput = Prisma.TrackWhereInput;

const addFuncs = {
  d: addDays,
  m: addMonths,
  y: addYears,
};
type Unit = "d" | "m" | "y";

// Generate a comparison query between an absolute date in a given unit
// makeAbsoluteComparison('=', new Date(2020, 1, 1), 'd') means "dates on the same day as 1/1/2020"
// makeAbsoluteComparison('=', new Date(2020, 1, 1), 'y') means "dates in the same year as 1/1/2020"
// makeAbsoluteComparison('>', new Date(2020, 1, 1), 'y') means "dates after 1/1/2020"
// makeAbsoluteComparison('<=', new Date(2020, 1, 1), 'y') means "dates before or on 1/1/2020"
function makeAbsoluteComparison(
  operator: string,
  date: Date,
  unit: Unit
): DateTimeFilter {
  // Determine the next day/month/year based on the given unit
  const addFunc = addFuncs[unit];
  const next = addFunc(date, 1);
  if (operator === "=") {
    // The model equals the date if it falls between the date and the next day/month/year
    return { gte: date, lt: next };
  } else if (operator === "<") {
    return { lt: date };
  } else if (operator === "<=") {
    return { lt: next };
  } else if (operator === ">") {
    return { gte: next };
  } else if (operator === ">=") {
    return { gte: date };
  } else {
    throw new Error("Invalid operator");
  }
}

// Generate a comparison query a certain distance before now
// makeRelativeComparison('=', 3, 'd') means "dates between 2 and 4 days before now"
// makeRelativeComparison('=', 3, 'm') means "dates between 2 and 4 months before now"
// makeRelativeComparison('>', 3, 'd') means "dates more than 3 days before now"
// makeRelativeComparison('<=', 3, 'y') means "dates 3 or fewer years before now"
function makeRelativeComparison(
  operator: string,
  amount: number,
  unit: Unit
): DateTimeFilter {
  const addFunc = addFuncs[unit];
  const now = new Date();
  if (operator === "=") {
    return { gt: addFunc(now, -amount - 1), lt: addFunc(now, -amount + 1) };
  } else if (operator === "<") {
    return { gt: addFunc(now, -amount) };
  } else if (operator === "<=") {
    return { gte: addFunc(now, -amount) };
  } else if (operator === ">") {
    return { lt: addFunc(now, -amount) };
  } else if (operator === ">=") {
    return { lte: addFunc(now, -amount) };
  } else {
    throw new Error("Invalid operator");
  }
}

const lexer = moo.compile({
  ws: / +/,
  number: { match: /[1-9]\d*/, value: (v: string) => parseInt(v, 10) },
  quotedString: { match: /\".+?\"/, value: (v: string) => v.slice(1, -1) },
  dateUnit: ["d", "m", "y"],

  cleanKw: "clean",
  explicitKw: "explicit",
  unlabeledKw: "unlabeled",
  addedKw: "added",
  releasedKw: "released",

  labelKw: "label:",
  albumKw: "album:",
  artistKw: "artist:",

  dash: "-",
  comparison: ["<=", ">=", "<", ">", "="],
  not: "!",
  and: "&&",
  or: "||",
  lparen: "(",
  rparen: ")",
});

const grammar = new Grammar(
  [
    {
      name: "main",
      symbols: [new RuleSymbol("binary")],
      postprocess: (d) => d[0],
    },
    {
      name: "relativeDate",
      symbols: [new TokenSymbol("number"), new TokenSymbol("dateUnit")],
      postprocess: ([amount, unit]) => ({
        amount: amount.value,
        unit: unit.value,
      }),
    },
    {
      name: "absoluteDate",
      symbols: [new TokenSymbol("number")],
      postprocess: ([year]) => ({
        unit: "y",
        date: new Date(year.value, 0, 1),
      }),
    },
    {
      name: "absoluteDate",
      symbols: [
        new TokenSymbol("number"),
        new TokenSymbol("dash"),
        new TokenSymbol("number"),
        new TokenSymbol("dash"),
        new TokenSymbol("number"),
      ],
      postprocess: ([month, _a, day, _b, year]) => ({
        unit: "d",
        date: new Date(year.value, month.value - 1, day.value),
      }),
    },
    {
      name: "added",
      symbols: [
        new TokenSymbol("addedKw"),
        new TokenSymbol("comparison"),
        new RuleSymbol("absoluteDate"),
      ],
      postprocess: ([_, operator, date]): TrackWhereInput => ({
        dateAdded: makeAbsoluteComparison(operator.value, date.date, date.unit),
      }),
    },
    {
      name: "added",
      symbols: [
        new TokenSymbol("addedKw"),
        new TokenSymbol("comparison"),
        new RuleSymbol("relativeDate"),
      ],
      postprocess: ([_, operator, date]): TrackWhereInput => ({
        dateAdded: makeRelativeComparison(
          operator.value,
          date.amount,
          date.unit
        ),
      }),
    },
    {
      name: "released",
      symbols: [
        new TokenSymbol("releasedKw"),
        new TokenSymbol("comparison"),
        new RuleSymbol("absoluteDate"),
      ],
      postprocess: ([_, operator, date]): TrackWhereInput => ({
        album: {
          dateReleased: makeAbsoluteComparison(
            operator.value,
            date.date,
            date.unit
          ),
        },
      }),
    },
    {
      name: "released",
      symbols: [
        new TokenSymbol("releasedKw"),
        new TokenSymbol("comparison"),
        new RuleSymbol("relativeDate"),
      ],
      postprocess: ([_, operator, date]): TrackWhereInput => ({
        album: {
          dateReleased: makeRelativeComparison(
            operator.value,
            date.amount,
            date.unit
          ),
        },
      }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("cleanKw")],
      postprocess: (_): TrackWhereInput => ({ explicit: false }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("explicitKw")],
      postprocess: (_): TrackWhereInput => ({ explicit: true }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("unlabeledKw")],
      postprocess: (_): TrackWhereInput => ({ labels: { none: {} } }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("labelKw"), new TokenSymbol("number")],
      postprocess: ([_, id]): TrackWhereInput => ({
        labels: { some: { id: id.value } },
      }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("albumKw"), new TokenSymbol("quotedString")],
      postprocess: ([_, name]: [unknown, string]): TrackWhereInput => ({
        album: { name: name.value },
      }),
    },
    {
      name: "value",
      symbols: [new TokenSymbol("artistKw"), new TokenSymbol("quotedString")],
      postprocess: ([_, name]: [unknown, string]): TrackWhereInput => ({
        artists: { some: { name: name.value } },
      }),
    },
    {
      name: "value",
      symbols: [new RuleSymbol("added")],
      postprocess: (d) => d[0],
    },
    {
      name: "value",
      symbols: [new RuleSymbol("released")],
      postprocess: (d) => d[0],
    },
    {
      name: "parentheses",
      symbols: [
        new TokenSymbol("lparen"),
        new RuleSymbol("binary"),
        new TokenSymbol("rparen"),
      ],
      postprocess: ([_, inner]) => inner,
    },
    {
      name: "parentheses",
      symbols: [new RuleSymbol("value")],
      postprocess: (d) => d[0],
    },
    {
      name: "unary",
      symbols: [new TokenSymbol("not"), new RuleSymbol("parentheses")],
      postprocess: ([_, rhs]: [unknown, TrackWhereInput]): TrackWhereInput => ({
        NOT: rhs,
      }),
    },
    {
      name: "unary",
      symbols: [new RuleSymbol("parentheses")],
      postprocess: (d) => d[0],
    },
    {
      name: "binary",
      symbols: [
        new RuleSymbol("binary"),
        new TokenSymbol("ws"),
        new TokenSymbol("and"),
        new TokenSymbol("ws"),
        new RuleSymbol("unary"),
      ],
      postprocess: ([lhs, _a, _b, _c, rhs]: [
        TrackWhereInput,
        unknown,
        unknown,
        unknown,
        TrackWhereInput
      ]): TrackWhereInput => ({ AND: [lhs, rhs] }),
    },
    {
      name: "binary",
      symbols: [
        new RuleSymbol("binary"),
        new TokenSymbol("ws"),
        new TokenSymbol("or"),
        new TokenSymbol("ws"),
        new RuleSymbol("unary"),
      ],
      postprocess: ([lhs, _a, _b, _c, rhs]: [
        TrackWhereInput,
        unknown,
        unknown,
        unknown,
        TrackWhereInput
      ]): TrackWhereInput => ({ OR: [lhs, rhs] }),
    },
    {
      name: "binary",
      symbols: [new RuleSymbol("unary")],
      postprocess: (d) => d[0],
    },
    { name: "ws", symbols: [new TokenSymbol("ws")], postprocess: undefined },
  ],
  "main"
);

const parser = new Parser(grammar, lexer);

export default parser;
