import {
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  describe,
  expect,
  it,
} from "vitest";

import AppHeader from "./AppHeader";

describe("AppHeader", () => {
  it("renders the shared application brand", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", {
        name: /decision study home/i,
      }),
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByText("Decision Study"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Human vs Machine"),
    ).toBeInTheDocument();
  });

  it("renders page-specific navigation", () => {
    render(
      <MemoryRouter>
        <AppHeader navigationLabel="Supervisor navigation">
          <a href="#workspace">Workspace</a>
        </AppHeader>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("navigation", {
        name: "Supervisor navigation",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: "Workspace",
      }),
    ).toHaveAttribute("href", "#workspace");
  });
});
