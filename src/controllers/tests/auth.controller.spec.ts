import { getAccountByEmailQuery } from "../../db/AccountQueries";
import { verifyPassword } from "../../services/bcrypService";
import { AccountModel } from "../../types/Account";
import loginController from "../Auth";

jest.mock("../../db/AccountQueries", () => {
  return {
    __esModule: true,
    getAccountByEmailQuery: jest.fn(),
    loginController: jest.fn(),
  };
});

jest.mock("../../services/bcrypService", () => {
  return {
    __esModule: true,
    verifyPassword: jest.fn().mockResolvedValue(true),
  };
});

// Sample test suite for Auth controller
describe("Auth", () => {
  // Mock data
  const mockAuths: AccountModel[] = [
    {
      id: "1",
      name: "John Doe",
      email: "johndoe@example.com",
      password: "$2b$10$kv0W3beLL8CV5kWVwmU.xeGhM5Yq9hHdctQkRGps7k50CBt9epz7a",
      birthdate: "1990-01-01",
      phone: "1234567890",
      account_type: "user",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "janesmith@example.com",
      password: "$2b$10$kv0W3beLL8CV5kWVwmU.xeGhM5Yq9hHdctQkRGps7k50CBt9epz7a",
      birthdate: "1992-02-02",
      phone: "0987654321",
      account_type: "user",
    },
  ];

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test case: successful login
  test("Should login successfully with valid credentials", async () => {
    // Mock the database response
    (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [mockAuths[0]],
    });

    // Call the login controller
    await loginController(
      { body: { email: "johndoe@example.com", password: "santiago" } } as any,
      res as any
    );

    // Assertions
    expect(verifyPassword).toHaveBeenCalledWith(
      "santiago",
      mockAuths[0].password
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Login successful",
        data: expect.objectContaining({
          id: mockAuths[0].id,
          token: expect.any(String),
          rol: mockAuths[0].account_type,
        }),
      })
    );
  });

  // Test case: invalid credentials
  test("Should return 401 for invalid credentials", async () => {
    // Mock the database response
    (getAccountByEmailQuery as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [mockAuths[0]],
    });

    // Mock password verification to return false
    (verifyPassword as jest.Mock).mockResolvedValueOnce(false);

    // Call the login controller
    await loginController(
      { body: { email: "johndoe@example.com", password: "santiago1" } } as any,
      res as any
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "An error ocurred",
        error: "Invalid email or password",
      })
    );
  });

  // Test case: database query failure
  test("Should return 500 error when deletion fails", async () => {
    const errorMessage = "Database error";
    (getAccountByEmailQuery as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );
    await loginController(
      { body: { email: mockAuths[0].email, password: "santiago" } } as any,
      res as any
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "An error occurred",
      error: errorMessage,
    });
  });
});
