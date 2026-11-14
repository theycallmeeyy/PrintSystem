import fs from 'fs';
import path from 'path';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';
import { defaultPricing, calculatePricing } from './pricingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const PRICING_FILE = path.join(DATA_DIR, 'pricing.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'staff-users.json');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Sample seed orders to demonstrate all status states
const seedOrders = [
  {
    id: 'PO-2026-1001',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    customer: {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '0917-555-0192',
      notes: 'Please double-check front cover alignment. Thank you!'
    },
    job: {
      jobTypeId: 'booklets',
      jobTypeName: 'Brochures & Booklets',
      paperSizeId: 'A4',
      paperSizeName: 'A4 (8.27" x 11.69" / 210 x 297mm)',
      customDimensions: null,
      paperMaterialId: 'cardstock-220',
      paperMaterialName: 'Heavy Cardstock (220 gsm)',
      colorModeId: 'color',
      colorModeName: 'Full Color Printing',
      printSideId: 'double',
      printSideName: 'Double-sided (Duplex, 2 Sides)',
      pagesPerCopy: 16,
      copies: 5,
      productQuantity: 5,
      selectedFinishing: ['binding-wire', 'lamination-matte']
    },
    formatting: {
      fontFamily: 'Calibri',
      fontSize: '12pt',
      fontStyle: 'regular',
      margins: { top: 1.0, bottom: 1.0, left: 1.25, right: 1.0, unit: 'in' },
      orientation: 'portrait',
      columns: 1,
      alignment: 'justify',
      lineSpacing: 1.15
    },
    files: [
      {
        originalName: 'Annual_Financial_Report_2026.pdf',
        filename: 'seed_sample_report.pdf',
        mimetype: 'application/pdf',
        size: 2450000,
        url: '/uploads/seed_sample_report.pdf'
      }
    ],
    status: 'finished', // 🟢 Green Dot
    statusHistory: [
      { status: 'new', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), note: 'Order received online' },
      { status: 'in-progress', timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), note: 'Printing & wire binding in progress' },
      { status: 'finished', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: 'Completed and packed. Ready for pickup.' }
    ],
    isRush: false,
    isDelivery: false,
    deliveryAddress: '',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    pricingSnapshot: null // will be computed on load
  },
  {
    id: 'PO-2026-1002',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    customer: {
      name: 'Carlos Mendoza',
      email: 'carlos.m@bistrocafe.ph',
      phone: '0928-888-4321',
      notes: 'Need vibrant colors for food photography!'
    },
    job: {
      jobTypeId: 'flyers',
      jobTypeName: 'Flyers & Leaflets',
      paperSizeId: 'Letter',
      paperSizeName: 'Short / Letter (8.5" x 11")',
      customDimensions: null,
      paperMaterialId: 'glossy-120',
      paperMaterialName: 'Glossy Paper (120 gsm)',
      colorModeId: 'color',
      colorModeName: 'Full Color Printing',
      printSideId: 'single',
      printSideName: 'Single-sided (1 Side)',
      pagesPerCopy: 1,
      copies: 1,
      productQuantity: 150,
      selectedFinishing: ['cutting-trim']
    },
    formatting: {
      fontFamily: 'Roboto',
      fontSize: '11pt',
      fontStyle: 'bold',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5, unit: 'in' },
      orientation: 'portrait',
      columns: 2,
      alignment: 'center',
      lineSpacing: 1.0
    },
    files: [
      {
        originalName: 'Grand_Opening_Menu_Flyer.png',
        filename: 'seed_sample_flyer.png',
        mimetype: 'image/png',
        size: 1850000,
        url: '/uploads/seed_sample_flyer.png'
      }
    ],
    status: 'in-progress', // 🟡 Yellow Dot
    statusHistory: [
      { status: 'new', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), note: 'Order received' },
      { status: 'in-progress', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: 'Batch printing on Heidelberg press' }
    ],
    isRush: true,
    isDelivery: true,
    deliveryAddress: 'Unit 4B Sunrise Bldg, Makati City',
    paymentStatus: 'paid',
    paymentMethod: 'maya',
    pricingSnapshot: null
  },
  {
    id: 'PO-2026-1003',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    customer: {
      name: 'Joanna Dela Cruz',
      email: 'joanna.delacruz@edu.ph',
      phone: '0995-123-9876',
      notes: 'Double-sided printing with corner staple please.'
    },
    job: {
      jobTypeId: 'document',
      jobTypeName: 'Document Printing',
      paperSizeId: 'A4',
      paperSizeName: 'A4 (8.27" x 11.69" / 210 x 297mm)',
      customDimensions: null,
      paperMaterialId: 'bond-80',
      paperMaterialName: 'Premium Bright Bond Paper (80 gsm)',
      colorModeId: 'bw',
      colorModeName: 'Black & White (Monochrome)',
      printSideId: 'double',
      printSideName: 'Double-sided (Duplex, 2 Sides)',
      pagesPerCopy: 45,
      copies: 3,
      productQuantity: 3,
      selectedFinishing: ['stapling-corner']
    },
    formatting: {
      fontFamily: 'Times New Roman',
      fontSize: '12pt',
      fontStyle: 'regular',
      margins: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.0, unit: 'in' },
      orientation: 'portrait',
      columns: 1,
      alignment: 'left',
      lineSpacing: 1.5
    },
    files: [
      {
        originalName: 'Final_Undergraduate_Thesis_Draft.docx',
        filename: 'seed_sample_thesis.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 980000,
        url: '/uploads/seed_sample_thesis.docx'
      }
    ],
    status: 'new', // 🔴 Red Dot
    statusHistory: [
      { status: 'new', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), note: 'Order submitted by customer' }
    ],
    isRush: false,
    isDelivery: false,
    deliveryAddress: '',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    pricingSnapshot: null
  }
];

export class Database {
  constructor() {
    this.pricing = this.loadPricing();
    this.orders = this.loadOrders();
    this.users = this.loadUsers();
    this.bootstrapSuperAdmin();
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        return Array.isArray(users) ? users : [];
      }
    } catch (err) {
      console.error('Error loading staff users:', err);
    }
    return [];
  }

  saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Error saving staff users:', err);
      throw new Error('Could not save staff accounts.');
    }
  }

  bootstrapSuperAdmin() {
    const email = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD;
    if (this.users.length === 0 && email && password) {
      this.createUser({ name: 'Super Admin', email, password, role: 'super_admin' });
      console.log(`[Auth] Bootstrapped initial super admin account: ${email}`);
    }
  }

  getPublicUser(user) {
    if (!user) return null;
    const { passwordHash, passwordSalt, ...publicUser } = user;
    return publicUser;
  }

  getAllUsers() {
    return this.users.map(user => this.getPublicUser(user));
  }

  getUserById(id) {
    return this.users.find(user => user.id === id) || null;
  }

  getUserByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return this.users.find(user => user.email === normalizedEmail) || null;
  }

  verifyUserPassword(user, password) {
    if (!user || typeof password !== 'string') return false;
    const candidate = scryptSync(password, user.passwordSalt, 64);
    const expected = Buffer.from(user.passwordHash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  createUser({ name, email, password, role }) {
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      throw new Error('Name must be between 2 and 80 characters.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.');
    }
    if (this.getUserByEmail(normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      throw new Error('Password must be between 10 and 128 characters.');
    }
    if (!['staff', 'admin', 'super_admin'].includes(role)) {
      throw new Error('Choose a valid account role.');
    }

    const passwordSalt = randomBytes(16).toString('hex');
    const user = {
      id: randomBytes(16).toString('hex'),
      name: normalizedName,
      email: normalizedEmail,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordSalt,
      passwordHash: scryptSync(password, passwordSalt, 64).toString('hex')
    };
    this.users.push(user);
    try {
      this.saveUsers();
    } catch (err) {
      this.users.pop();
      throw err;
    }
    return this.getPublicUser(user);
  }

  updateUserActive(id, isActive) {
    const user = this.getUserById(id);
    if (!user) return null;
    if (typeof isActive !== 'boolean') throw new Error('Account status must be enabled or disabled.');
    if (user.role === 'super_admin' && !isActive &&
      this.users.filter(candidate => candidate.role === 'super_admin' && candidate.isActive).length <= 1) {
      throw new Error('At least one active super admin account is required.');
    }
    const previousState = user.isActive;
    user.isActive = isActive;
    try {
      this.saveUsers();
    } catch (err) {
      user.isActive = previousState;
      throw err;
    }
    return this.getPublicUser(user);
  }

  loadPricing() {
    try {
      if (fs.existsSync(PRICING_FILE)) {
        const raw = fs.readFileSync(PRICING_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading pricing file, falling back to default:', err);
    }
    this.savePricing(defaultPricing);
    return defaultPricing;
  }

  savePricing(pricingData) {
    try {
      fs.writeFileSync(PRICING_FILE, JSON.stringify(pricingData, null, 2), 'utf-8');
      this.pricing = pricingData;
      return true;
    } catch (err) {
      console.error('Error saving pricing:', err);
      return false;
    }
  }

  loadOrders() {
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading orders file:', err);
    }

    // Initialize with seeded sample orders, computing their pricing snapshot
    const initializedOrders = seedOrders.map(order => {
      const calc = calculatePricing({
        jobTypeId: order.job.jobTypeId,
        paperSizeId: order.job.paperSizeId,
        paperMaterialId: order.job.paperMaterialId,
        colorModeId: order.job.colorModeId,
        printSideId: order.job.printSideId,
        pagesPerCopy: order.job.pagesPerCopy,
        copies: order.job.copies,
        productQuantity: order.job.productQuantity,
        selectedFinishing: order.job.selectedFinishing,
        isRush: order.isRush,
        isDelivery: order.isDelivery
      }, defaultPricing);
      return {
        ...order,
        pricingSnapshot: calc
      };
    });

    this.saveOrders(initializedOrders);
    return initializedOrders;
  }

  saveOrders(ordersData) {
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersData, null, 2), 'utf-8');
      this.orders = ordersData;
      return true;
    } catch (err) {
      console.error('Error saving orders:', err);
      return false;
    }
  }

  getPricing() {
    return this.pricing;
  }

  updatePricing(newPricing) {
    this.pricing = { ...defaultPricing, ...newPricing };
    this.savePricing(this.pricing);
    return this.pricing;
  }

  resetPricingToDefault() {
    this.pricing = defaultPricing;
    this.savePricing(this.pricing);
    return this.pricing;
  }

  getAllOrders() {
    return [...this.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrderById(id) {
    return this.orders.find(o => o.id.toUpperCase() === id.trim().toUpperCase());
  }

  getNextOrderNumber() {
    const year = new Date().getFullYear();
    const existingNum = this.orders.reduce((max, o) => {
      const match = o.id.match(/PO-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1000);
    return `PO-${year}-${existingNum + 1}`;
  }

  createOrder(orderInput) {
    const orderNumber = this.getNextOrderNumber();
    const currentPricing = this.getPricing();

    // Calculate official backend pricing snapshot so client cannot forge prices
    const officialPricingSnapshot = calculatePricing({
      jobTypeId: orderInput.job.jobTypeId,
      paperSizeId: orderInput.job.paperSizeId,
      paperMaterialId: orderInput.job.paperMaterialId,
      colorModeId: orderInput.job.colorModeId,
      printSideId: orderInput.job.printSideId,
      pagesPerCopy: orderInput.job.pagesPerCopy,
      copies: orderInput.job.copies,
      productQuantity: orderInput.job.productQuantity,
      selectedFinishing: orderInput.job.selectedFinishing,
      isRush: orderInput.isRush,
      isDelivery: orderInput.isDelivery,
      discountCode: orderInput.discountCode,
      customDiscountAmount: orderInput.customDiscountAmount
    }, currentPricing);

    const newOrder = {
      id: orderNumber,
      createdAt: new Date().toISOString(),
      customer: {
        name: orderInput.customer.name || 'Anonymous Customer',
        email: orderInput.customer.email || '',
        phone: orderInput.customer.phone || '',
        notes: orderInput.customer.notes || ''
      },
      job: {
        ...orderInput.job,
        jobTypeName: (currentPricing.jobTypes.find(j => j.id === orderInput.job.jobTypeId) || {}).name || orderInput.job.jobTypeId,
        paperSizeName: (currentPricing.paperSizes.find(s => s.id === orderInput.job.paperSizeId) || {}).name || orderInput.job.paperSizeId,
        paperMaterialName: (currentPricing.paperMaterials.find(m => m.id === orderInput.job.paperMaterialId) || {}).name || orderInput.job.paperMaterialId,
        colorModeName: (currentPricing.colorModes.find(c => c.id === orderInput.job.colorModeId) || {}).name || orderInput.job.colorModeId,
        printSideName: (currentPricing.printSides.find(s => s.id === orderInput.job.printSideId) || {}).name || orderInput.job.printSideId
      },
      formatting: orderInput.formatting || {
        fontFamily: 'Arial',
        fontSize: '11pt',
        fontStyle: 'regular',
        margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0, unit: 'in' },
        orientation: 'portrait',
        columns: 1,
        alignment: 'left',
        lineSpacing: 1.15
      },
      files: orderInput.files || [],
      status: 'new', // 🔴 Red Dot
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          note: 'Order submitted to print shop queue'
        }
      ],
      isRush: Boolean(orderInput.isRush),
      isDelivery: Boolean(orderInput.isDelivery),
      deliveryAddress: orderInput.deliveryAddress || '',
      paymentStatus: 'unpaid',
      paymentMethod: orderInput.paymentMethod || 'cash',
      pricingSnapshot: officialPricingSnapshot,
      quoteAdjustment: null // Can be set if staff revises quote
    };

    this.orders.unshift(newOrder);
    this.saveOrders(this.orders);
    return newOrder;
  }

  updateOrderStatus(orderId, newStatus, staffNote = '') {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    if (!['new', 'in-progress', 'finished'].includes(newStatus)) {
      throw new Error('Invalid status. Allowed values: new, in-progress, finished');
    }

    order.status = newStatus;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: staffNote || `Status changed to ${newStatus}`
    });

    this.saveOrders(this.orders);
    return order;
  }

  reviseOrderQuote(orderId, { revisedAmount, reason, staffName }) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const parsedAmount = Number(parseFloat(revisedAmount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      throw new Error('Revised amount must be a positive number');
    }

    order.quoteAdjustment = {
      revisedGrandTotal: parsedAmount,
      originalGrandTotal: order.pricingSnapshot.costs.grandTotal,
      reason: reason || 'Custom work or material adjustment',
      staffName: staffName || 'Print Shop Staff',
      dateProposed: new Date().toISOString(),
      customerApproved: false
    };

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Revised quotation proposed: ${parsedAmount.toFixed(2)}₱ (${reason})`
    });

    this.saveOrders(this.orders);
    return order;
  }

  customerAcceptQuote(orderId) {
    const order = this.getOrderById(orderId);
    if (!order || !order.quoteAdjustment) return null;

    order.quoteAdjustment.customerApproved = true;
    order.quoteAdjustment.dateApproved = new Date().toISOString();

    // Update active grand total in pricingSnapshot
    order.pricingSnapshot.costs.grandTotal = order.quoteAdjustment.revisedGrandTotal;

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Customer approved revised quotation of ${order.quoteAdjustment.revisedGrandTotal.toFixed(2)}₱`
    });

    this.saveOrders(this.orders);
    return order;
  }

  updatePayment(orderId, { paymentStatus, paymentMethod }) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;

    this.saveOrders(this.orders);
    return order;
  }
}

export const db = new Database();
