/** What is selected in the builder: a question or one of the two screens. */
export type Selection = { kind: "welcome" } | { kind: "question"; id: string } | { kind: "ending" };
