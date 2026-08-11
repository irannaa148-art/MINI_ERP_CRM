import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';

import { login, loginSchema, getMe } from '../controllers/authController';
import {
  createCustomer,
  createCustomerSchema,
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerSchema,
  addCustomerNote,
  addCustomerNoteSchema,
} from '../controllers/customerController';
import {
  createProduct,
  createProductSchema,
  getProducts,
  getProductById,
  updateProduct,
  updateProductSchema,
  getProductStockLog,
  recordStockMovement,
  stockMovementSchema,
} from '../controllers/productController';
import {
  createChallan,
  createChallanSchema,
  getChallans,
  getChallanById,
  updateChallan,
  updateChallanSchema,
  confirmChallan,
  cancelChallan,
  downloadChallanInvoice,
} from '../controllers/challanController';
import { getDashboardStats } from '../controllers/dashboardController';

const router = Router();

// ==========================================
// 1. AUTH ROUTES
// ==========================================
router.post('/auth/login', validate(loginSchema), login);
router.get('/auth/me', authenticate, getMe);

// ==========================================
// 2. DASHBOARD ROUTES
// ==========================================
router.get('/dashboard/stats', authenticate, getDashboardStats);

// ==========================================
// 3. CUSTOMER CRM ROUTES
// ==========================================
router.post(
  '/customers',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  validate(createCustomerSchema),
  createCustomer
);

router.get('/customers', authenticate, getCustomers);
router.get('/customers/:id', authenticate, getCustomerById);

router.put(
  '/customers/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  validate(updateCustomerSchema),
  updateCustomer
);

router.post(
  '/customers/:id/notes',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  validate(addCustomerNoteSchema),
  addCustomerNote
);

// ==========================================
// 4. PRODUCT & INVENTORY ROUTES
// ==========================================
router.post(
  '/products',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  upload.single('image'),
  validate(createProductSchema),
  createProduct
);

router.get('/products', authenticate, getProducts);
router.get('/products/:id', authenticate, getProductById);

router.put(
  '/products/:id',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  upload.single('image'),
  validate(updateProductSchema),
  updateProduct
);

router.get('/products/:id/stock-log', authenticate, getProductStockLog);

router.post(
  '/products/:id/stock-movement',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate(stockMovementSchema),
  recordStockMovement
);

// ==========================================
// 5. SALES CHALLAN ROUTES
// ==========================================
router.post(
  '/challans',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  validate(createChallanSchema),
  createChallan
);

router.get('/challans', authenticate, getChallans);
router.get('/challans/:id', authenticate, getChallanById);

router.put(
  '/challans/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  validate(updateChallanSchema),
  updateChallan
);

router.post(
  '/challans/:id/confirm',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  confirmChallan
);

router.post(
  '/challans/:id/cancel',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  cancelChallan
);

router.get('/challans/:id/invoice', authenticate, downloadChallanInvoice);

export default router;
