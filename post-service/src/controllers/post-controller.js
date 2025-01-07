const logger = require('../utils/logger');
const Post = require('../models/Post');
const { validateCreatePost } = require('../utils/validation');

async function invalidatePostCache(req, input) {
  // const cachedKey = `post:${input}`;
  // await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys('posts:*');

  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info('Create post endpoint hit...');

  try {
    //validate the schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;

    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newPost.save();
    logger.info('Post created successfully', newPost);
    await invalidatePostCache(req, newPost._id.toString());

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
    });
  } catch (error) {
    logger.error('Error creating post', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info('Get all posts endpoint hit...');

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNumOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNumOfPosts / limit),
      totalPosts: totalNumOfPosts,
    };

    // save your posts in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error('Error fetching posts', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
    });
  }
};

const getPost = async (req, res) => {
  logger.info('Get post endpoint hit...');

  try {
  } catch (error) {
    logger.error('Error fetching post', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
    });
  }
};

const deletePost = async (req, res) => {
  logger.info('Delete post endpoint hit...');

  try {
  } catch (error) {
    logger.error('Error deleting post', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
