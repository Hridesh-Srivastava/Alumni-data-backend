import express from "express"
import {
  getAcademicUnits,
  getAcademicUnitById,
  createAcademicUnit,
  updateAcademicUnit,
  deleteAcademicUnit,
} from "../controllers/academicUnit.js"
import { protect, admin } from "../middleware/auth.js"

const router = express.Router()

router.route("/").get(protect, getAcademicUnits).post(protect, admin, createAcademicUnit)

router
  .route("/:id")
  .get(protect, getAcademicUnitById)
  .put(protect, admin, updateAcademicUnit)
  .delete(protect, admin, deleteAcademicUnit)

export default router

