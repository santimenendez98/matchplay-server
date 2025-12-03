import { getComplexByIdQuery } from "../../db/ComplexQueries";
import {
  createCourtQuery,
  deleteCourtQuery,
  getAllCourtQuery,
  getCourtByIdQuery,
  updateCourtQuery,
} from "../../db/CourtQueries";
import { complexModel } from "../../types/Complex";
import { CourtModel } from "../../types/Court";
import { createCourt, deleteCourt, getCourts, updateCourt } from "../Court";

jest.mock("../../db/CourtQueries", () => {
  return {
    __esModule: true,
    getAllCourtQuery: jest.fn(),
    createCourtQuery: jest.fn(),
    getCourtByIdQuery: jest.fn(),
    deleteCourtQuery: jest.fn(),
    updateCourtQuery: jest.fn(),
  };
});

jest.mock("../../db/ComplexQueries", () => {
  return {
    __esModule: true,
    getComplexByIdQuery: jest.fn(),
  };
});

describe("Court", () => {
  const mockCourts: CourtModel[] = [
    {
      complex_id: "10",
      sport_id: "100",
      name: "Court A",
      image_url: "http://image.url/courtA.jpg",
    },
  ];

  const complexMock: complexModel[] = [
    {
      admin_id: "1",
      name: "Sale 5",
      location: "ruta 48",
      description: "Futbol 5 y 7",
      image_url: "http://image.url/sample.jpg",
    },
  ];

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Get Courts", () => {
    // Test case: get a list of all courts
    test("Should get a list for all courts", async () => {
      (getAllCourtQuery as jest.Mock).mockResolvedValue({
        rows: mockCourts,
      });

      await getCourts({} as any, res as any);

      expect(getAllCourtQuery).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Court List",
        data: mockCourts,
      });
    });

    // Test case: error while getting courts
    test("Should handle error when getting courts", async () => {
      (getAllCourtQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await getCourts({} as any, res as any);

      expect(getAllCourtQuery).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Database error",
      });
    });
  });

  describe("Create Court", () => {
    // Test case: create a new court
    test("Should create a new court", async () => {
      (createCourtQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });

      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [complexMock[0]],
      });

      await createCourt({ body: mockCourts[0] } as any, res as any);

      expect(getComplexByIdQuery).toHaveBeenCalledWith(
        mockCourts[0].complex_id
      );
      expect(createCourtQuery).toHaveBeenCalledWith(mockCourts[0]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Court created successfully",
        data: mockCourts[0],
      });
    });

    // Test case: Complex not found
    test("Should return 400 if complex not found", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      (createCourtQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });

      await createCourt({ body: mockCourts[0] } as any, res as any);

      expect(getComplexByIdQuery).toHaveBeenCalledWith(
        mockCourts[0].complex_id
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Complex not found",
      });
    });

    // Test case: error while creating court
    test("Should handle error when creating court", async () => {
      (getComplexByIdQuery as jest.Mock).mockResolvedValue({
        rowCount: 1,
        rows: [complexMock[0]],
      });

      (createCourtQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await createCourt({ body: mockCourts[0] } as any, res as any);

      expect(getComplexByIdQuery).toHaveBeenCalledWith(
        mockCourts[0].complex_id
      );
      expect(createCourtQuery).toHaveBeenCalledWith(mockCourts[0]);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: "Database error",
      });
    });
  });

  describe("Delete Court", () => {
    // Test case: delete a court
    test("Should delete a court", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });
      (deleteCourtQuery as jest.Mock).mockResolvedValue({});

      await deleteCourt({ params: { id: "1" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(deleteCourtQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Court deleted successfully",
      });
    });

    // Test case: court not found
    test("Should return 404 error when court to delete not found", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
      });

      (deleteCourtQuery as jest.Mock).mockResolvedValue({});

      await deleteCourt({ params: { id: "2" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Court not found",
      });
    });

    // Test case: error while deleting court
    test("Should handle error when deleting court", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });

      (deleteCourtQuery as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await deleteCourt({ params: { id: "1" } } as any, res as any);

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(deleteCourtQuery).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: "Database error",
      });
    });
  });

  describe("Update Court", () => {
    // Test case: update a court
    test("Should update a court", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });
      (updateCourtQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });

      await updateCourt(
        { params: { id: "1" }, body: { name: "New Court" } } as any,
        res as any
      );

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(updateCourtQuery).toHaveBeenCalledWith("1", { name: "New Court" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Court updated successfully",
        data: mockCourts[0],
      });
    });

    // Test case: court not found
    test("Should return 404 error when court to update not found", async () => {
      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [],
      });

      await updateCourt(
        { params: { id: "2" }, body: { name: "New Court" } } as any,
        res as any
      );

      expect(getCourtByIdQuery).toHaveBeenCalledWith("2");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error ocurred",
        error: "Court not found",
      });
    });

    // Test case: error while updating court
    test("Should handle error when updating court", async () => {
      const errorMessage = "Database error";

      (getCourtByIdQuery as jest.Mock).mockResolvedValue({
        rows: [mockCourts[0]],
      });
      (updateCourtQuery as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await updateCourt(
        { params: { id: "1" }, body: { name: "New Court" } } as any,
        res as any
      );

      expect(getCourtByIdQuery).toHaveBeenCalledWith("1");
      expect(updateCourtQuery).toHaveBeenCalledWith("1", { name: "New Court" });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An error occurred",
        error: errorMessage,
      });
    });
  });
});
