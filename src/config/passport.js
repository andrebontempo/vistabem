const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const mailService = require('../services/mailService');

function configurePassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth não configurado (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ausentes).');
    return false;
  }

  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('A conta Google não retornou e-mail.'));

          const avatar = profile.photos?.[0]?.value || '';
          let user = await User.findOne({ googleId: profile.id });
          if (!user) user = await User.findOne({ email });

          if (user) {
            if (!user.active) return done(null, false);
            if (!user.googleId) user.googleId = profile.id;
            if (!user.avatar && avatar) user.avatar = avatar;
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          user = await User.create({
            name: profile.displayName || 'Cliente Vista Bem',
            email,
            googleId: profile.id,
            avatar,
            authProvider: 'google',
            lastLoginAt: new Date(),
          });

          mailService.sendWelcome(user).catch((e) => console.error('[Mail] welcome:', e.message));
          mailService.sendAdminNewUser(user).catch((e) => console.error('[Mail] admin user:', e.message));

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  return true;
}

module.exports = configurePassport;
