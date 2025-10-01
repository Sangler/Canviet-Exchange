const { body, validationResult } = require('express-validator')

const emailRule = body('email')
  .exists({ checkFalsy: true }).withMessage('Email is required')
  .isString().withMessage('Email must be a string')
  .isEmail().withMessage('Invalid email')
  .normalizeEmail()

const passwordRule = body('password')
  .exists({ checkFalsy: true }).withMessage('Password is required')
  .isString().withMessage('Password must be a string')
  .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')

const firstNameRule = body('firstName')
  .optional({ checkFalsy: true }).withMessage('firstName is required')
  .isString().withMessage('firstName must be a string')
  .trim()
  .isLength({ min: 1, max: 50 }).withMessage('firstName must be between 1 and 50 characters')
  .matches(/^[A-Za-z][A-Za-z .'-]{0,48}$/).withMessage("firstName can contain letters, spaces, periods, apostrophes, and hyphens")

const lastNameRule = body('lastName')
  .optional({ nullable: true })
  .isString().withMessage('lastName must be a string')
  .trim()
  .isLength({ min: 1, max: 50 }).withMessage('lastName must be between 1 and 50 characters')
  .matches(/^[A-Za-z][A-Za-z .'-]{0,48}$/).withMessage("lastName can contain letters, spaces, periods, apostrophes, and hyphens")

const phoneRule = body('phone')
  .optional({ nullable: true })
  .isString().withMessage('phone must be a string')
  .trim()

const dateOfBirthRule = body('dateOfBirth')
  .optional({ nullable: true })
  .isISO8601().withMessage('dateOfBirth must be a valid date')

const addressRule = body('address')
  .optional({ nullable: true })
  .isObject().withMessage('address must be an object')

const addressFieldsRules = [
  body('address.street').optional({ nullable: true }).isString().withMessage('address.street must be a string').trim(),
  body('address.postalCode').optional({ nullable: true }).isString().withMessage('address.postalCode must be a string').trim(),
  body('address.city').optional({ nullable: true }).isString().withMessage('address.city must be a string').trim(),
]

// POST /api/auth/login
const authLoginValidator = [
  emailRule,
  passwordRule,
]

// POST /api/auth/register
const authRegisterValidator = [
  emailRule,
  passwordRule,
  firstNameRule,
  lastNameRule,
  phoneRule,
  dateOfBirthRule,
  addressRule,
  ...addressFieldsRules,
]

function validate(req, res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()
  return res.status(422).json({ message: 'Validation failed', errors: result.array() })
}

module.exports = {
  authLoginValidator,
  authRegisterValidator,
  validate,
}
