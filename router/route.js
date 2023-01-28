import { Router } from "express";

const router = Router();

// import all controllers
import * as contrller from "../controllers/appController.js";

export default router;

// POST methods

router.route("/register").post(contrller.register);
// router.route("/registerMail").post(contrller.);
router.route("/authenticate").post((req, res) => res.end());
router.route("/login").post(contrller.verifyUser, contrller.login);

// GET methods

router.route("/user/:username").get(contrller.getUser);
router.route("/generateOTP").get(contrller.generateOTP);
router.route("/verifyOTP").get(contrller.verifyOTP);
router.route("/createResetSession").get(contrller.createResetSession);

// PUT methods

router.route("/updateUser").put(contrller.updateUser);
router.route("/resetPassword").put(contrller.resetPassword);
