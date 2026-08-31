import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import "dotenv/config";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

if (googleClientId && googleClientSecret) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        passReqToCallback: true,
      },

    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userType = req.query.state || "patient";

        const { emails, displayName, photos } = profile;
        const email = emails?.[0]?.value;
        const photo = photos?.[0]?.value;

        if (userType === "doctor") {
          let user = await Doctor.findOne({ email });
          if (!user) {
            user = await Doctor.create({
              googleId: profile.id,
              email,
              name: displayName,
              profileImage: photo,
              isVerified: true,
            });
          } else {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.profileImage = photo;
              await user.save();
            }
          }

          return done(null, { user, type: "doctor" });
        } else {
          let user = await Patient.findOne({ email });
          if (!user) {
            user = await Patient.create({
              googleId: profile.id,
              email,
              name: displayName,
              profileImage: photo,
              isVerified: true,
            });
          } else {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.profileImage = photo;
              await user.save();
            }
          }

          return done(null, { user, type: "patient" });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);
} else {
  console.log("ℹ️  Google OAuth credentials not provided; Google login will be disabled.");
}

export default passport;