// utils/userValidation.js
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');

const complexityOptions = {
  min: 10,
  max: 60,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 1,
  requirementCount: 4,
};

const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Le username est requis.',
      'string.min': 'Le username doit contenir au moins 1 caractère.',
      'string.max': 'Le username ne peut pas dépasser 100 caractères.',
      'any.required': 'Le username est requis.',
    }),

  password: passwordComplexity(complexityOptions, 'Mot de passe')
    .required()
    .messages({
      'any.required': 'Le mot de passe est requis.',
    }),

  lastLogin: Joi.alternatives()
    .try(Joi.date().iso(), Joi.valid(null))
    .optional()
    .messages({
      'date.format': 'lastLogin doit être une date ISO valide ou null.',
    }),

  projectIds: Joi.array()
    .items(
      Joi.string()
        .length(24)
        .hex()
        .message('Chaque projectId doit être un ObjectId hexadécimal de 24 caractères.')
    )
    .optional()
    .messages({
      'array.base': 'projectIds doit être un tableau d’ObjectId sous forme de chaînes.',
    }),

  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Le rôle doit être "user" ou "admin".',
    }),
});

const loginSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Le username est requis.',
      'any.required': 'Le username est requis.',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Le mot de passe est requis.',
      'any.required': 'Le mot de passe est requis.',
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
};