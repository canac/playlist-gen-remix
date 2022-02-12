@{%
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
%}

@preprocessor typescript

@lexer lexer

main -> binary {% id %}
parentheses -> %lparen binary %rparen {% x => x[1] %}
             | %value {% x => get => get(x[0].value) %}
unary -> %not parentheses {% x => get => !x[1](get) %}
       | parentheses {% id %}
binary -> binary %ws %and %ws unary {% x => get => x[0](get) && x[4](get) %}
        | binary %ws %or %ws unary {% x => get => x[0](get) || x[4](get) %}
		| unary {% id %}
ws -> %ws {% null %}
