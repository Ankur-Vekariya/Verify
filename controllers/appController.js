import UserModel from "../model/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ENV from "../config.js";
import otpGenerator from "otp-generator";

export async function verifyUser(req, res, next) {
  try {
    const { username } = req.method == "GET" ? req.query : req.body;

    let exist = await UserModel.findOne({ username });
    if (!exist) return res.status(404).send({ error: "can't find user" });

    next();
  } catch (error) {
    return res.status(404).send({ error: "Authentication error" });
  }
}

export async function register(req, res) {
  try {
    const { username, password, profile, email, mobile, firstName, lastName } =
      req.body;

    const existUsername = new Promise((resolve, reject) => {
      UserModel.findOne({ username }, function (err, user) {
        if (err) reject(new Error(err));
        if (user) reject({ error: "Please use unique username" });
        resolve();
      });
    });

    const existEmail = new Promise((resolve, reject) => {
      UserModel.findOne({ email }, function (err, email) {
        if (err) reject(new Error(err));
        if (email) reject({ error: "Please use unique email" });
        resolve();
      });
    });

    Promise.all([existUsername, existEmail])
      .then(() => {
        if (password) {
          bcrypt
            .hash(password, 10)
            .then((hasheddPassword) => {
              const user = new UserModel({
                username,
                password: hasheddPassword,
                profile: profile || "",
                email: email,
              });

              user
                .save()
                .then((result) =>
                  res.status(201).send({ msg: "registerd successfully" })
                )
                .catch((error) => res.status(500).send({ error }));
            })
            .catch((error) => {
              return res.status(500).send({
                error: "Enable to hashed password",
              });
            });
        }
      })
      .catch((error) => {
        return res.status(500).send({
          error,
        });
      });
  } catch (error) {
    return res.status(500).send(error);
  }
}

export async function login(req, res) {
  const { username, password } = req.body;
  try {
    UserModel.findOne({ username })
      .then((user) => {
        bcrypt
          .compare(password, user.password)
          .then((passwordCheck) => {
            if (!passwordCheck) {
              return res.status(400).send({ error: "Password does not match" });
            }
            const token = jwt.sign(
              {
                userId: user._id,
                username: user.username,
              },
              ENV.JWT_SECRET,
              { expiresIn: "24h" }
            );
            return res.status(200).send({
              msg: "login successfull",
              username: user.username,
              token,
            });
          })
          .catch((error) => {
            res.status(404).send({ error: "Password does not match" });
          });
      })
      .catch((error) => {
        return res.status(404).send({ error: "Username not found" });
      });
  } catch (error) {
    return res.status(500).send({ error });
  }
}

export async function getUser(req, res) {
  const { username } = req.params;
  try {
    if (!username) return res.status(501).send({ error: "Invalif username" });

    UserModel.findOne({ username }, function (err, user) {
      if (err) return res.status(500).send({ err });
      if (!user)
        return res.status(501).send({ error: "Couldn't find the user" });
      const { password, ...rest } = Object.assign({}, user.toJSON());
      return res.status(201).send(rest);
    });
  } catch (error) {
    res.status(404).send({ error: "Cannot find user data" });
  }
}

export async function updateUser(req, res) {
  try {
    const { userId } = req.user;
    if (userId) {
      const body = req.body;
      UserModel.updateOne({ _id: userId }, body, function (err, data) {
        if (err) throw err;
        return res.status(201).send({ msg: "record updated" });
      });
    } else {
      return res.status(401).send({ error: "user not found" });
    }
  } catch (error) {
    console.log("----------------", error);
    return res.status(401).send({ error });
  }
}

export async function generateOTP(req, res) {
  req.app.locals.OTP = await otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  res.status(201).send({ code: req.app.locals.OTP });
}

export async function verifyOTP(req, res) {
  const { code } = req.query;
  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.OTP = null;
    req.app.locals.resetSession = true;
    return res.status(201).send({ msg: "verify successfully" });
  }
  return res.status(200).send({ msg: "Invalid otp" });
}

export async function createResetSession(req, res) {
  if (req.app.locals.resetSession) {
    req.app.locals.resetSession = false;
    return res.status(201).send({ msg: "Access grated" });
  }
  return res.status(400).send({ error: "Session expired" });
}

export async function resetPassword(req, res) {
  try {
    if (!req.app.locals.resetSession) {
      return res.status(400).send({ error: "Session expired" });
    }
    const { username, password } = req.body;
    try {
      UserModel.findOne({ username })
        .then((user) => {
          bcrypt
            .hash(password, 10)
            .then((hasheddPassword) => {
              UserModel.updateOne(
                { username: user.username },
                { password: hasheddPassword },
                function (err, data) {
                  if (err) {
                    throw err;
                  }
                  req.app.locals.resetSession = false;
                  return res.status(201).send({ msg: "Record updated" });
                }
              );
            })
            .catch((error) => {
              return res.status(404).send({ error: "Unable to hash password" });
            });
        })
        .catch((error) => {
          return res.status(404).send({ error: "Username not found" });
        });
    } catch (error) {
      return res.status(500).send({ error });
    }
  } catch (error) {
    return res.status(401).send({ error });
  }
}
