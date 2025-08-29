import { Request, Response } from "express";
import {
  complexGetModelSuccess,
  complexModel,
  complexModelSuccess,
  UpdateComplexModel,
} from "../types/Complex";
import { errorResponseModel, paramsModels } from "../types";
import {
  getAllComplexesQuery,
  getComplexByIdQuery,
  createComplexQuery,
  updateComplexQuery,
  deleteComplexQuery,
} from "../db/ComplexQueries";
import { getAccountAdminQuery } from "../db/AccountQueries";

// Get all complexes
export const getComplexData = async (
  req: Request,
  res: Response<complexModelSuccess | errorResponseModel>
) => {
  try {
    const complex = await getAllComplexesQuery();
    res.status(200).json({ message: "Complex List", data: complex.rows });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error ocurred", error: err.message });
  }
};

// Create a new complex
export const createComplexData = async (
  req: Request<{}, {}, complexModel>,
  res: Response<complexGetModelSuccess | errorResponseModel>
) => {
  try {
    const { admin_id, name, location, description, image_url } = req.body;

    const verifyAdmin = await getAccountAdminQuery(admin_id);

    if (verifyAdmin.rows.length === 0) {
      return res.status(400).json({
        message: "An error ocurred",
        error: "Account not found or is not an admin",
      });
    }

    const newComplex = await createComplexQuery({
      admin_id,
      name,
      location,
      description,
      image_url,
    });

    return res.status(201).json({
      message: "Complex created successfully",
      data: newComplex.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

// Delete a complex
export const deleteComplexData = async (
  req: Request<paramsModels>,
  res: Response<complexGetModelSuccess | errorResponseModel>
) => {
  try {
    const { id } = req.params;

    const complex = await getComplexByIdQuery(id);

    if (complex.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Complex not found" });
    }

    const result = await deleteComplexQuery(id);

    return res.status(200).json({
      message: "Complesx deleted successfully",
      error: result.rows[0],
    });
  } catch (error) {
    const err = error as Error;
    return res
      .status(500)
      .json({ message: "An error occurred", error: err.message });
  }
};

// Update a complex
export const updateComplexData = async (
  req: Request<paramsModels, UpdateComplexModel>,
  res: Response<complexModelSuccess | errorResponseModel>
) => {
  const { id } = req.params;
  const { name, location, description, image_url } = req.body;
  try {
    const complex = await getComplexByIdQuery(id);

    if (complex.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "An error ocurred", error: "Complex not found" });
    }

    const fields = { name, location, description, image_url };
    const keys = Object.keys(fields).filter(
      (key) => fields[key as keyof typeof fields] !== undefined
    );

    if (keys.length === 0) {
      return res
        .status(400)
        .json({ message: "An error ocurred", error: "No fields to update" });
    }
    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    const values = keys.map((key) => fields[key as keyof typeof fields]);

    const result = await updateComplexQuery(
      `UPDATE Complex SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *`,
      [...values, id]
    );
    res
      .status(200)
      .json({ message: "Complex updated successfully", data: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
};

export default {
  getComplexData,
  createComplexData,
  deleteComplexData,
  updateComplexData,
};
