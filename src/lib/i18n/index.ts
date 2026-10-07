import { ptBR } from "./messages/pt-BR";

/**
 * Estrutura de i18n.
 * Hoje há um único idioma (pt-BR). Para adicionar outro, crie `messages/<locale>.ts`
 * tipado como `Messages`, registre em `dictionaries` e passe o locale para `getMessages`.
 */

/** Converte o dicionário literal em um "molde" que outros idiomas precisam seguir. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof ptBR>;

export const locales = ["pt-BR"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";

const dictionaries: Record<Locale, Messages> = {
  "pt-BR": ptBR,
};

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}

/** Atalho para o idioma padrão, usado por componentes de servidor e cliente. */
export const messages = getMessages();
