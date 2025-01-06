const logger = require('../utils/logger');
const { validateRegistration } = require('../utils/validation');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

// user registration
const registerUser = async (req, res) => {
  logger.info('Registration endpoint hit...');
  try {
    // validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn('User already exists');
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    user = new User({
      username,
      email,
      password,
    });

    await user.save();
    logger.info('User registered successfully', user._id);
  } catch (error) {}
};

// user login

// refresh token

// logout
