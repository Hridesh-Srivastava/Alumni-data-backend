import express from "express"
import {
  getAlumni,
  getAlumniById,
  createAlumni,
  updateAlumni,
  deleteAlumni,
  searchAlumni,
  getAlumniStats,
} from "../controllers/alumni.js"
import { protect, admin } from "../middleware/auth.js"

const router = express.Router()

router.route("/").get(protect, getAlumni).post(protect, admin, createAlumni)

router.get("/search", protect, searchAlumni)
router.get("/stats", protect, getAlumniStats)

router.route("/:id").get(protect, getAlumniById).put(protect, admin, updateAlumni).delete(protect, admin, deleteAlumni)

export default router

