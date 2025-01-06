const logger = require('../utils/logger');
const { validateRegistration, validateLogin } = require('../utils/validation');
const User = require('../models/User');
const { generateTokens } = require('../utils/generateToken');

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

    const { accessToken, refreshToken } = await generateTokens(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error occurred', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// user login
const loginUser = async (req, res) => {
  logger.info('Login endpoint hit...');
  try {
    const { error } = validateLogin(req.body);

    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn('Invalid user');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // check if the password matches
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      logger.warn('Invalid password');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error('Login error occurred', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// refresh token

// logout

module.exports = {
  registerUser,
  loginUser,
};
