import { Router } from "express";
import {
  getScheduleDay,
  createScheduleDay,
  deleteScheduleDay,
  updateScheduleDay,
} from "../controllers/ScheduleDay";
import {
  getScheduleDayPrice,
  createScheduleDayPrice,
  updateScheduleDayPrice,
  deleteScheduleDayPrice,
} from "../controllers/ScheduleDayPrice";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const scheduleDayRouter = Router();

// Get all schedule days
scheduleDayRouter.get("/", getScheduleDay);

// Create a new schedule day
scheduleDayRouter.post(
  "/",
  body("court_id")
    .isEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  body("schedule_date")
    .isEmpty()
    .withMessage("Schedule date is required")
    .isISO8601()
    .withMessage("Schedule date must be a valid date (yyyy-mm-dd)"),
  body("start_time")
    .isEmpty()
    .withMessage("Start time is required")
    .isString()
    .withMessage("Start time must be a string"),
  body("end_time")
    .isEmpty()
    .withMessage("End time is required")
    .isString()
    .withMessage("End time must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleDay
);

// Update an existing schedule day
scheduleDayRouter.put(
  "/:id",
  param("id")
    .isEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  body("court_id")
    .optional()
    .isString()
    .withMessage("Court ID must be a string"),
  body("schedule_date")
    .optional()
    .isISO8601()
    .withMessage("Schedule date must be a valid date (yyyy-mm-dd)"),
  body("start_time")
    .optional()
    .isString()
    .withMessage("Start time must be a string"),
  body("end_time")
    .optional()
    .isString()
    .withMessage("End time must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleDay
);

// Delete a schedule day
scheduleDayRouter.delete(
  "/:id",
  param("id")
    .isEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleDay
);

// Get schedule day prices
scheduleDayRouter.get("/price", authMiddleware, getScheduleDayPrice);

// Create a new schedule day price
scheduleDayRouter.post(
  "/price",
  body("schedule_id")
    .notEmpty()
    .withMessage("Schedule_id is required")
    .isString()
    .withMessage("Schedule_id must be a string"),
  body("hourprice")
    .notEmpty()
    .withMessage("Hour price is required")
    .isNumeric()
    .withMessage("Hour price must be a number"),
  body("halfprice")
    .notEmpty()
    .withMessage("Half price is required")
    .isNumeric()
    .withMessage("Half price must be a number"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleDayPrice
);

// Update an existing schedule day price
scheduleDayRouter.put(
  "/price/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  body("schedule_id")
    .optional()
    .isString()
    .withMessage("Schedule ID must be a string"),
  body("hourprice")
    .optional()
    .isNumeric()
    .withMessage("Hour price must be a number"),
  body("halfprice")
    .optional()
    .isNumeric()
    .withMessage("Half price must be a number"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  updateScheduleDayPrice
);

// Delete a schedule day price
scheduleDayRouter.delete(
  "/price/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleDayPrice
);

export default scheduleDayRouter;
