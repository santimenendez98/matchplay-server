import { AccountModel } from "../../types/Account";
import {
  getAccounts,
  getAccountById,
  createAccount,
  deleteAccount,
  updateAccount,
} from "../Account";
import {
  getAllAccountsQuery,
  getAccountByIdQuery,
  createAccountQuery,
  deleteAccountQuery,
  updateAccountQuery,
} from "../../db/AccountQueries";
import { verifyPassword } from "../../services/bcrypService";

// Mock the database query module
jest.mock("../../db/AccountQueries", () => {
  return {
    __esModule: true,
    getAllAccountsQuery: jest.fn(),
    getAccountByIdQuery: jest.fn(),
    createAccountQuery: jest.fn(),
    deleteAccountQuery: jest.fn(),
    updateAccountQuery: jest.fn(),
  };
});

// Sample test suite for Account controller
describe("Accounts", () => {
  const mockAccounts: AccountModel[] = [
    {
      id: "1",
      name: "John Doe",
      email: "johndoe@example.com",
      password: "hashedpassword",
      birthdate: "1990-01-01",
      phone: "1234567890",
      account_type: "user",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "janesmith@example.com",
      password: "hashedpassword",
      birthdate: "1992-02-02",
      phone: "0987654321",
      account_type: "admin",
    },
  ];

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test for getting all accounts
  describe("Get all Accounts", () => {
    // Test case: successful retrieval of accounts
    test("Should return a list of accounts", async () => {
      (getAllAccountsQuery as jest.Mock).mockResolvedValue({
        rows: mockAccounts,
      });

      await getAccounts(
        { headers: { authorization: "Bearer tokenfalso" } } as any,
        res as any
      );

      expect(getAllAccountsQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account List",
        data: mockAccounts,
      });
    });

    // Test case: database query failure
    test("Should return 500 error when query fails", async () => {
      const errorMessage = "Database error";
      (getAllAccountsQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await getAccounts({} as any, res as any);

      expect(getAllAccountsQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: errorMessage,
      });
    });
  });

  // Test for getting account by ID
  describe("Get Account by ID", () => {
    // Test case: account found
    test("Should return account found by ID", async () => {
      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      await getAccountById({ params: { id: "1" } } as any, res as any);

      expect(getAccountByIdQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account found",
        data: mockAccounts[0],
      });
    });

    // Test case: account not found
    test("Should return 404 error when account not found", async () => {
      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await getAccountById({ params: { id: "3" } } as any, res as any);

      expect(getAccountByIdQuery).toHaveBeenCalledWith("3");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    // Test case: database query failure
    test("Should return 500 error when query fails", async () => {
      const errorMessage = "Database error";
      (getAccountByIdQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await getAccountById({ params: { id: "3" } } as any, res as any);

      expect(getAccountByIdQuery).toHaveBeenCalledWith("3");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: errorMessage,
      });
    });
  });

  // Test for creating an account
  describe("Create Account", () => {
    // Test case: successful account creation
    test("Should create a new account", async () => {
      (createAccountQuery as jest.Mock).mockResolvedValue({
        rows: [mockAccounts[0]],
      });

      await createAccount({ body: mockAccounts[0] } as any, res as any);

      // Verify that the password was hashed before saving
      const savedAccount = (createAccountQuery as jest.Mock).mock.calls[0][0];
      expect(savedAccount.password).not.toBe(mockAccounts[0].password);

      // Verify that the hashed password matches the original password
      const isPasswordHashed = await verifyPassword(
        mockAccounts[0].password,
        savedAccount.password
      );
      expect(isPasswordHashed).toBe(true);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account created successfully",
        data: mockAccounts[0],
      });
    });

    // Test case: database query failure
    test("Should return 500 error when creation fails", async () => {
      const errorMessage = "Database error";
      (createAccountQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await createAccount({ body: mockAccounts[0] } as any, res as any);

      expect(createAccountQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: errorMessage,
      });
    });
  });

  // Test for deleting an account
  describe("Delete Account", () => {
    // Test case: successful account deletion
    test("Should delete an account", async () => {
      (deleteAccountQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [mockAccounts[0]],
      });

      await deleteAccount({ params: { id: "1" } } as any, res as any);

      expect(deleteAccountQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account deleted successfully",
        data: mockAccounts[0],
      });
    });

    // Test case: account not found
    test("Should return 404 error when account to delete not found", async () => {
      (deleteAccountQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      await deleteAccount({ params: { id: "3" } } as any, res as any);

      expect(deleteAccountQuery).toHaveBeenCalledWith("3");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found",
      });
    });

    // Test case: database query failure
    test("Should return 500 error when deletion fails", async () => {
      const errorMessage = "Database error";
      (deleteAccountQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );
      await deleteAccount({ params: { id: "3" } } as any, res as any);

      expect(deleteAccountQuery).toHaveBeenCalledWith("3");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: errorMessage,
      });
    });
  });

  // Test for updating an account
  describe("Update Account", () => {
    test("Should update an existing account", async () => {
      (getAccountByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockAccounts[0]],
      });

      (updateAccountQuery as jest.Mock).mockResolvedValue({
        rows: [mockAccounts[0]],
      });

      await updateAccount(
        {
          params: { id: "1" },
          body: {
            name: "John Updated",
          },
        } as any,
        res as any
      );

      expect(updateAccountQuery).toHaveBeenCalledWith("1", {
        name: "John Updated",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account updated successfully",
        data: mockAccounts[0],
      });
    });
  });
});
