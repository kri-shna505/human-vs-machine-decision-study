export interface SupervisorQuestionOption {
  id: string;
  label: string;
}

export interface SupervisorQuestion {
  id: string;
  category: string;
  title: string;
  context: string;
  prompt: string;
  options: readonly SupervisorQuestionOption[];
}

export const SUPERVISOR_QUESTIONS: readonly SupervisorQuestion[] = [
  {
    id: "conjunction-probability",
    category: "Probability estimation",
    title: "Conjunction Fallacy",
    context:
      "Linda is 31 years old, single, outspoken, and very bright. " +
      "She studied philosophy and was deeply concerned with discrimination " +
      "and social justice as a student.",
    prompt: "Which statement is more probable?",
    options: [
      {
        id: "bank-teller",
        label: "Linda is a bank teller.",
      },
      {
        id: "bank-teller-activist",
        label:
          "Linda is a bank teller and is active in the feminist movement.",
      },
    ],
  },
  {
    id: "framing-program",
    category: "Contextual bias",
    title: "Framing Effect",
    context:
      "A disease is expected to affect 600 people. Two response programs " +
      "have been proposed.",
    prompt: "Which program would you choose?",
    options: [
      {
        id: "certain-save",
        label: "Program A: 200 people will be saved.",
      },
      {
        id: "probabilistic-save",
        label:
          "Program B: a one-third chance that all 600 people will be saved " +
          "and a two-thirds chance that nobody will be saved.",
      },
    ],
  },
  {
    id: "risk-reward",
    category: "Expected value",
    title: "Risk Preference",
    context:
      "Imagine that one of the following rewards will be added to your " +
      "current payment.",
    prompt: "Which option would you choose?",
    options: [
      {
        id: "guaranteed-reward",
        label: "Receive $500 with certainty.",
      },
      {
        id: "variable-reward",
        label:
          "A 50% chance to receive $1,100 and a 50% chance to receive $0.",
      },
    ],
  },
];
