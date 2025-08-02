import { Router } from "express";
import {
  createScheduleCourtWeek,
  getScheduleCourtWeek,
  updateScheduleCourtWeek,
  deleteScheduleCourtWeek,
  generateScheduleCourtWeek,
} from "../controllers/ScheduleCourtWeek";
import {
  getScheduleWeekPrice,
  createScheduleWeekPrice,
  updateScheduleWeekPrice,
  deleteScheduleWeekPrice,
} from "../controllers/ScheduleWeekPrice";
import { authMiddleware, rolMiddleware } from "../middleware";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validatorErrors";

export const scheduleCourtWeekRouter = Router();

// Get all schedule court weeks
scheduleCourtWeekRouter.get(
  "/",
  authMiddleware,
  rolMiddleware(["admin"]),
  getScheduleCourtWeek
);

// Create a new schedule court week
scheduleCourtWeekRouter.post(
  "/",
  body("court_id")
    .isString()
    .notEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  body("day_of_week")
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)")
    .isInt({ min: 0, max: 6 })
    .notEmpty()
    .withMessage("Day of week is required"),
  body("start_time")
    .isString()
    .notEmpty()
    .withMessage("Start time is required")
    .isString()
    .withMessage("Start time must be a string"),
  body("end_time")
    .isString()
    .notEmpty()
    .withMessage("End time is required")
    .isString()
    .withMessage("End time must be a string"),
  body("hourprice")
    .isNumeric()
    .notEmpty()
    .withMessage("Hour price is required")
    .isNumeric()
    .withMessage("Hour price must be a number"),
  body("halfprice")
    .isNumeric()
    .notEmpty()
    .withMessage("Half price is required")
    .isNumeric()
    .withMessage("Half price must be a number"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  createScheduleCourtWeek
);

// Update an existing schedule court week
scheduleCourtWeekRouter.patch(
  "/:id",
  authMiddleware,
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  body("court_id")
    .optional()
    .isString()
    .withMessage("Court ID must be a string"),
  body("day_of_week")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  body("start_time")
    .optional()
    .isString()
    .withMessage("Start time must be a string"),
  body("end_time")
    .optional()
    .isString()
    .withMessage("End time must be a string"),
  body("hourprice")
    .optional()
    .isNumeric()
    .withMessage("Hour price must be a number"),
  body("halfprice")
    .optional()
    .isNumeric()
    .withMessage("Half price must be a number"),
  handleValidationErrors,
  rolMiddleware(["admin"]),
  updateScheduleCourtWeek
);

// Delete a schedule court week
scheduleCourtWeekRouter.delete(
  "/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleCourtWeek
);

// Generate schedule court week
scheduleCourtWeekRouter.post(
  "/generate",
  body("court_id")
    .notEmpty()
    .withMessage("Court ID is required")
    .isString()
    .withMessage("Court ID must be a string"),
  body("day_of_week")
    .notEmpty()
    .withMessage("Day of week is required")
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  body("start_time")
    .notEmpty()
    .withMessage("Start time is required")
    .isString()
    .withMessage("Start time must be a string"),
  body("end_time")
    .notEmpty()
    .withMessage("End time is required")
    .isString()
    .withMessage("End time must be a string"),
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
  generateScheduleCourtWeek
);

// Schedule week price routes
scheduleCourtWeekRouter.get("/price", authMiddleware, getScheduleWeekPrice);

// Create a new schedule week price
scheduleCourtWeekRouter.post(
  "/price",
  body("week_schedule_id")
    .notEmpty()
    .withMessage("Week schedule ID is required")
    .isString()
    .withMessage("Week schedule ID must be a string"),
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
  createScheduleWeekPrice
);

// Update an existing schedule week price
scheduleCourtWeekRouter.put(
  "/price/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  body("week_schedule_id")
    .optional()
    .isString()
    .withMessage("Week schedule ID must be a string"),
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
  updateScheduleWeekPrice
);

// Delete a schedule week price
scheduleCourtWeekRouter.delete(
  "/price/:id",
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isString()
    .withMessage("ID must be a string"),
  handleValidationErrors,
  authMiddleware,
  rolMiddleware(["admin"]),
  deleteScheduleWeekPrice
);

export default scheduleCourtWeekRouter;
