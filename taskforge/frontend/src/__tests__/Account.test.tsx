import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountPage from "../pages/Account";

const mockChangePassword = vi.fn(async () => ({ ok: true }));

vi.mock("../api/auth", () => ({
  changePassword: (current: string, next: string) => mockChangePassword(current, next),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "hello@example.com",
      email_verified_at: null,
      providers: ["local"],
    },
  }),
}));

describe("AccountPage", () => {
  beforeEach(() => {
    mockChangePassword.mockClear();
  });

  it("shows the email and updates password", async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByText("hello@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Current password"), { target: { value: "oldpassword123" } });
    fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: "newpassword456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "newpassword456" } });
    fireEvent.click(screen.getByText("Update password"));

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith("oldpassword123", "newpassword456")
    );
    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
  });
});
