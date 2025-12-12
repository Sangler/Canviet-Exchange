const router = require('express').Router();
const Request = require('../models/Requests');
const authMiddleware = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimit');
const logger = require('../utils/logger');
const crypto = require('crypto');
const Stripe = require('stripe');
const emailSvc = require('../services/email');

// Small helper to escape HTML when injecting user-provided strings into templates
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format a number with commas as thousands separators. Accepts number or numeric string.
function formatNumber(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '';
  // Remove existing commas, then parse
  const cleaned = String(value).replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-US');
}

// Optional auth middleware - doesn't reject if no token
const optionalAuth = (req, res, next) => {