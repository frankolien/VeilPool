import { describe, expect, it } from "vitest";
import { IDLE, flowReducer, presentStep, type FlowState } from "../transactions/flow";
import { productError } from "../errors/taxonomy";

type Step = "validate" | "authorize" | "encrypt" | "confirm";

const reduce = (state: FlowState<Step>, ...actions: Parameters<typeof flowReducer<Step>>[1][]) =>
  actions.reduce(flowReducer<Step>, state);

describe("flowReducer", () => {
  it("completes the previous step when a new one is entered", () => {
    const state = reduce(IDLE as FlowState<Step>,
      { type: "enter", step: "validate" },
      { type: "enter", step: "encrypt" },
    );

    expect(state).toMatchObject({ status: "active", step: "encrypt", completed: ["validate"] });
  });

  it("records a skipped step without disturbing the sequence", () => {
    // The branch that motivated naming steps explicitly: skipping an approval
    // must not shift every later step by one.
    const state = reduce(IDLE as FlowState<Step>,
      { type: "enter", step: "validate" },
      { type: "markSkipped", step: "authorize" },
      { type: "enter", step: "encrypt" },
    );

    expect(presentStep(state, "authorize")).toBe("skipped");
    expect(presentStep(state, "encrypt")).toBe("active");
    expect(presentStep(state, "confirm")).toBe("pending");
  });

  it("remembers which step failed", () => {
    const error = productError("relayer-unavailable");
    const state = reduce(IDLE as FlowState<Step>,
      { type: "enter", step: "validate" },
      { type: "enter", step: "encrypt" },
      { type: "fail", error },
    );

    expect(state).toMatchObject({ status: "failed", step: "encrypt", error });
    expect(presentStep(state, "encrypt")).toBe("failed");
    expect(presentStep(state, "validate")).toBe("done");
  });

  it("is terminal once settled", () => {
    // A late stage report from an aborted gateway call must not resurrect a
    // flow the user has already been told the outcome of.
    const settled = reduce(IDLE as FlowState<Step>,
      { type: "enter", step: "validate" },
      { type: "succeed", hash: "0xabc" },
    );

    expect(reduce(settled, { type: "enter", step: "confirm" })).toBe(settled);
    expect(reduce(settled, { type: "fail", error: productError("unknown") })).toBe(settled);
  });

  it("ignores actions that arrive before the flow starts", () => {
    expect(reduce(IDLE as FlowState<Step>, { type: "succeed" })).toBe(IDLE);
    expect(reduce(IDLE as FlowState<Step>, { type: "markSkipped", step: "authorize" })).toBe(IDLE);
  });

  it("resets to idle", () => {
    const state = reduce(IDLE as FlowState<Step>,
      { type: "enter", step: "validate" },
      { type: "fail", error: productError("unknown") },
      { type: "reset" },
    );
    expect(state).toEqual(IDLE);
  });
});
