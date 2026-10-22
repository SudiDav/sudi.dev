import { createCssVariablesTheme, createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import bash from 'shiki/langs/bash.mjs'
import csharp from 'shiki/langs/csharp.mjs'
import json from 'shiki/langs/json.mjs'
import sql from 'shiki/langs/sql.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import yaml from 'shiki/langs/yaml.mjs'

export type CodeToken = { content: string; color?: string }

// Colours come from --code-* variables in globals.css, so code follows the
// site palette and switches with the light and dark themes.
const theme = createCssVariablesTheme({ name: 'site', variablePrefix: '--code-' })

// The JavaScript regex engine keeps highlighting synchronous (no WASM to load),
// so code blocks render inside the article's synchronous MDX components.
const highlighter = createHighlighterCoreSync({
  themes: [theme],
  langs: [bash, csharp, json, sql, typescript, yaml],
  engine: createJavaScriptRegexEngine(),
})

/** Split code into lines of coloured tokens; unknown languages come back uncoloured. */
export function highlight(code: string, lang: string): CodeToken[][] {
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    return code.split('\n').map((line) => [{ content: line }])
  }
  return highlighter
    .codeToTokens(code, { lang, theme: 'site' })
    .tokens.map((line) => line.map(({ content, color }) => ({ content, color })))
}
