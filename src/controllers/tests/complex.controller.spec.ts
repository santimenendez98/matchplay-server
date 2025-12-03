import { getAccountAdminQuery } from "../../db/AccountQueries";
import {
  createComplexQuery,
  deleteComplexQuery,
  getAllComplexesQuery,
  getComplexByIdQuery,
  updateComplexQuery,
} from "../../db/ComplexQueries";
import { verifyCloudinaryFile } from "../../services/cloudinary";
import { AccountModel } from "../../types/Account";
import { complexModel } from "../../types/Complex";
import {
  createComplexData,
  deleteComplexData,
  getComplexData,
  updateComplexData,
} from "../Complex";

jest.mock("../../db/ComplexQueries", () => {
  return {
    __esModule: true,
    getAllComplexesQuery: jest.fn(),
    createComplexQuery: jest.fn(),
    deleteComplexQuery: jest.fn(),
    getComplexByIdQuery: jest.fn(),
    updateComplexQuery: jest.fn(),
  };
});

jest.mock("../../db/AccountQueries", () => {
  return {
    __esModule: true,
    getAccountAdminQuery: jest.fn(),
  };
});

jest.mock("../../services/cloudinary", () => {
  return {
    __esModule: true,
    verifyCloudinaryFile: jest.fn(),
  };
});

describe("Complex", () => {
  //Mock data
  const mockComplex: complexModel[] = [
    {
      admin_id: "1",
      name: "Sale 5",
      location: "ruta 48",
      description: "Futbol 5 y 7",
      image_url: "http://image.url/sample.jpg",
    },
  ];

  const mockAdmin: AccountModel[] = [
    {
      id: "1",
      name: "Admin User",
      email: "admin@admin.com",
      phone: "095692189",
      password: "santiago",
      birthdate: "18/09/1998",
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

  describe("Get Complex", () => {
    // Test case: get all complexes
    test("Should get a list for all complex", async () => {
      (getAllComplexesQuery as jest.Mock).mockResolvedValue({
        rows: mockComplex,
      });

      await getComplexData({} as any, res as any);

      expect(getAllComplexesQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Complex List",
        data: mockComplex,
      });
    });

    // Test case: error while getting complexes
    test("Should handle error when getting complexes", async () => {
      (getAllComplexesQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await getComplexData({} as any, res as any);

      expect(getAllComplexesQuery).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Create Complex", () => {
    // Test case: create a new complex
    test("Should create a new complex", async () => {
      (createComplexQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (getAccountAdminQuery as jest.Mock).mockResolvedValue({
        rows: mockAdmin[0],
      });

      await createComplexData({ body: mockComplex[0] } as any, res as any);

      expect(getAccountAdminQuery).toHaveBeenCalledWith(mockAdmin[0].id);
      expect(createComplexQuery).toHaveBeenCalledWith(mockComplex[0]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Complex created successfully",
        data: mockComplex[0],
      });
    });

    // Test case: invalid admin ID
    test("Should return 400 for invalid admin ID", async () => {
      (getAccountAdminQuery as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await createComplexData({ body: mockComplex[0] } as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Account not found or is not an admin",
      });
    });

    // Test case: invalid image URL
    test("Should return 400 for invalid image URL", async () => {
      (getAccountAdminQuery as jest.Mock).mockResolvedValue({
        rows: mockAdmin[0],
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(false);

      await createComplexData({ body: mockComplex[0] } as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Invalid image URL",
      });
    });

    // Test case: error while creating complex
    test("Should handle error when creating complex", async () => {
      (getAccountAdminQuery as jest.Mock).mockResolvedValue({
        rows: mockAdmin[0],
      });

      (verifyCloudinaryFile as jest.Mock).mockResolvedValue(true);

      (createComplexQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await createComplexData({ body: mockComplex[0] } as any, res as any);

      expect(createComplexQuery).toHaveBeenCalledWith(mockComplex[0]);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: "Database error",
      });
    });
  });

  describe("Delete Complex", () => {
    // Test case: delete a complex
    test("Should delete a complex", async () => {
      (deleteComplexQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      await deleteComplexData({ params: { id: "1" } } as any, res as any);

      expect(getComplexByIdQuery).toHaveBeenCalled();
      expect(deleteComplexQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Complex deleted successfully",
        data: mockComplex[0],
      });
    });

    // Test case: complex not found
    test("Should return 404 error when complex to delete not found", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await deleteComplexData({ params: { id: "2" } } as any, res as any);

      expect(getComplexByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Complex not found",
      });
    });

    // Test case: database query failure
    test("Should return 500 error when deletion fails", async () => {
      const errorMessage = "Database error";
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });
      (deleteComplexQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );
      await deleteComplexData({ params: { id: "1" } } as any, res as any);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: errorMessage,
      });
    });
  });

  describe("Update Complex", () => {
    // Test case: update a complex
    test("Should update a complex", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      (updateComplexQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      await updateComplexData(
        { params: { id: "1" }, body: { name: "Las gemelas" } } as any,
        res as any
      );

      expect(getComplexByIdQuery).toHaveBeenCalledWith("1");
      expect(updateComplexQuery).toHaveBeenCalledWith("1", {
        name: "Las gemelas",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Complex updated successfully",
        data: mockComplex[0],
      });
    });

    // Test case: complex not found
    test("Should return 404 error when complex to update not found", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await updateComplexData(
        { params: { id: "2" }, body: { name: "Las gemelas" } } as any,
        res as any
      );

      expect(getComplexByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Complex not found",
      });
    });

    // Test case: database query failure
    test("Should return 500 error when update fails", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockComplex[0]],
      });

      (updateComplexQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await updateComplexData(
        { params: { id: "1" }, body: { name: "Las gemelas" } } as any,
        res as any
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });
});
