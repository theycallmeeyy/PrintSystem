import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { calculatePricing } from './pricingEngine.js';
import { PRIVACY_POLICY_VERSION } from '../privacyPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const isClientLocalTimestamp = (value) => (
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?[+-]\d{2}:\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value))
);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Create sample seed files if they don't exist yet so previews work out-of-the-box
const seedFlyerPath = path.join(UPLOAD_DIR, 'seed_sample_flyer.png');
if (!fs.existsSync(seedFlyerPath)) {
  // 1x1 transparent png or dummy buffer
  const dummyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(seedFlyerPath, dummyPng);
}
const seedReportPath = path.join(UPLOAD_DIR, 'seed_sample_report.pdf');
if (!fs.existsSync(seedReportPath)) {
  fs.writeFileSync(seedReportPath, '%PDF-1.4\n%Seed PDF Document\n1 0 obj\n<< /Title (Annual Financial Report 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
}
const seedThesisPath = path.join(UPLOAD_DIR, 'seed_sample_thesis.docx');
if (!fs.existsSync(seedThesisPath)) {
  fs.writeFileSync(seedThesisPath, 'PK\x03\x04Seed DOCX Document');
}

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : '*';
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;
const sessions = new Map();
const loginFailures = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

const getSessionUser = (token) => {
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = db.getUserById(session.userId);
  if (!user || !user.isActive) {
    sessions.delete(token);
    return null;
  }
  return user;
};

const authenticate = (req, res, next) => {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const user = token && getSessionUser(token);
  if (!user) return res.status(401).json({ error: 'Please sign in with a staff account.' });
  req.staffUser = user;
  req.sessionToken = token;
  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.staffUser || !roles.includes(req.staffUser.role)) {
    return res.status(403).json({ error: 'Your account does not have permission to do this.' });
  }
  return next();
};

const publicOrderView = (order) => {
  const publicOrder = { ...order };
  delete publicOrder.privacyConsent;
  return {
    ...publicOrder,
    customer: { name: 'Customer' },
    files: [],
    deliveryAddress: '',
    formatting: {
      orientation: order.formatting?.orientation,
      columns: order.formatting?.columns
    },
    statusHistory: (order.statusHistory || []).map(({ status, timestamp, note }) => ({
      status,
      timestamp,
      note
    }))
  };
};

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  const user = getSessionUser(token);
  if (!user) return next(new Error('Invalid or expired staff session.'));
  socket.data.staffUser = user;
  return next();
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static uploads
app.use('/uploads', express.static(UPLOAD_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Support PDF, DOC, DOCX, JPG, PNG, WEBP, SVG, TIFF, etc.
  const allowedExtensions = /\.(pdf|docx|doc|jpg|jpeg|png|webp|svg|gif|txt|ppt|pptx|xls|xlsx)$/i;
  if (file.originalname.match(allowedExtensions)) {
    cb(null, true);
  } else {
    cb(new Error('File format not supported. Please upload PDF, Word (DOCX/DOC), or image files.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1000MB max file size
  fileFilter
});

// Socket.io Real-time connection management
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  if (socket.data.staffUser) socket.join('staff');

  socket.on('join_room', (roomName) => {
    if (roomName === 'staff' && socket.data.staffUser) {
      socket.join('staff');
      return;
    }
    if (typeof roomName === 'string' && roomName.startsWith('order:')) {
      const orderId = roomName.slice('order:'.length);
      if (db.getOrderById(orderId)) socket.join(`order:${orderId}`);
    }
  });

  socket.on('leave_room', (roomName) => {
    socket.leave(roomName);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ================= API ENDPOINTS =================

app.get('/api/auth/setup', (req, res) => {
  const needsSetup = db.getAllUsers().length === 0;
  const setupBlocked = needsSetup && process.env.NODE_ENV === 'production' &&
    (!process.env.INITIAL_SUPER_ADMIN_EMAIL || !process.env.INITIAL_SUPER_ADMIN_PASSWORD);
  res.json({ needsSetup: needsSetup && !setupBlocked, setupBlocked });
});

app.post('/api/auth/setup', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' &&
      (!process.env.INITIAL_SUPER_ADMIN_EMAIL || !process.env.INITIAL_SUPER_ADMIN_PASSWORD)) {
      return res.status(503).json({ error: 'Configure the initial Super Admin environment variables before creating accounts in production.' });
    }
    if (db.getAllUsers().length !== 0) {
      return res.status(409).json({ error: 'Initial account setup has already been completed.' });
    }
    const user = db.createUser({ ...req.body, role: 'super_admin' });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
    return res.status(201).json({ token, user });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not create the initial account.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip;
  const failures = loginFailures.get(ip);
  if (failures?.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  }
  const user = db.getUserByEmail(req.body?.email);
  if (!user || !user.isActive || !db.verifyUserPassword(user, req.body?.password)) {
    const updatedFailures = { count: (failures?.count || 0) + 1, lockedUntil: 0 };
    if (updatedFailures.count >= 8) updatedFailures.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    loginFailures.set(ip, updatedFailures);
    if (updatedFailures.lockedUntil) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
    }
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  loginFailures.delete(ip);
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
  return res.json({ token, user: db.getPublicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: db.getPublicUser(req.staffUser) });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  sessions.delete(req.sessionToken);
  res.json({ success: true });
});

app.get('/api/admin/users', authenticate, requireRole('super_admin'), (req, res) => {
  res.json(db.getAllUsers());
});

app.post('/api/admin/users', authenticate, requireRole('super_admin'), (req, res) => {
  try {
    if (!['staff', 'admin'].includes(req.body?.role)) {
      return res.status(400).json({ error: 'New accounts can have the Staff or Admin role.' });
    }
    const user = db.createUser(req.body);
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not create staff account.' });
  }
});

app.patch('/api/admin/users/:id', authenticate, requireRole('super_admin'), (req, res) => {
  try {
    if (req.params.id === req.staffUser.id && req.body?.isActive === false) {
      return res.status(400).json({ error: 'You cannot disable your own account.' });
    }
    const user = db.updateUserActive(req.params.id, req.body?.isActive);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (!user.isActive) {
      for (const [token, session] of sessions.entries()) {
        if (session.userId === user.id) sessions.delete(token);
      }
    }
    return res.json({ user });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Could not update account.' });
  }
});

// 1. File Upload endpoint
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    res.json({ success: true, files: uploadedFiles });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File exceeds the 1000 MB per-file upload limit.' });
  }

  if (err) {
    return res.status(400).json({ error: err.message || 'File upload failed.' });
  }

  return next();
});

// 2. Pricing endpoints
app.get('/api/pricing', (req, res) => {
  try {
    const pricing = db.getPricing();
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pricing', authenticate, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const updated = db.updatePricing(req.body);
    // Broadcast pricing update to all connected clients immediately
    io.emit('pricing:updated', updated);
    res.json({ success: true, pricing: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/pricing/reset', authenticate, requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const reset = db.resetPricingToDefault();
    io.emit('pricing:updated', reset);
    res.json({ success: true, pricing: reset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backend live price calculator endpoint
app.post('/api/pricing/calculate', (req, res) => {
  try {
    const currentPricing = db.getPricing();
    const calculation = calculatePricing(req.body, currentPricing);
    res.json(calculation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Order endpoints
app.get('/api/orders', authenticate, requireRole('staff', 'admin', 'super_admin'), (req, res) => {
  try {
    const { status, search } = req.query;
    let orders = db.getAllOrders();

    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.email || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').toLowerCase().includes(q) ||
        (o.job?.jobTypeName || '').toLowerCase().includes(q)
      );
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(publicOrderView(order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { customer, job, formatting, files, isRush, isDelivery, deliveryAddress, discountCode, paymentMethod, privacyConsent } = req.body;

    if (
      privacyConsent?.accepted !== true ||
      privacyConsent?.version !== PRIVACY_POLICY_VERSION ||
      !isClientLocalTimestamp(privacyConsent.acceptedAt) ||
      !isClientLocalTimestamp(privacyConsent.orderSubmittedAtClient) ||
      Date.parse(privacyConsent.orderSubmittedAtClient) < Date.parse(privacyConsent.acceptedAt) ||
      typeof privacyConsent.marketingOptIn !== 'boolean'
    ) {
      return res.status(400).json({ error: 'Please accept the build3x Privacy Policy before placing an order' });
    }

    if (!job || !job.jobTypeId) {
      return res.status(400).json({ error: 'Job type selection is required' });
    }

    const createdOrder = db.createOrder({
      customer: customer || {},
      job,
      formatting,
      files: files || [],
      isRush: Boolean(isRush),
      isDelivery: Boolean(isDelivery),
      deliveryAddress,
      discountCode,
      paymentMethod,
      privacyConsent: {
        accepted: true,
        acceptedAt: privacyConsent.acceptedAt,
        orderSubmittedAtClient: privacyConsent.orderSubmittedAtClient,
        receivedAtServer: new Date().toISOString(),
        version: PRIVACY_POLICY_VERSION,
        marketingOptIn: privacyConsent.marketingOptIn
      }
    });

    io.to('staff').emit('order:created', createdOrder);

    res.status(201).json(createdOrder);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update order status (New -> In Progress -> Finished)
app.patch('/api/orders/:id/status', authenticate, requireRole('staff', 'admin', 'super_admin'), (req, res) => {
  try {
    const { status, note } = req.body;
    const updated = db.updateOrderStatus(req.params.id, status, note);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    io.to('staff').emit('order:status_changed', { orderId: updated.id, status: updated.status, order: updated });
    io.to(`order:${updated.id}`).emit('order:status_changed', {
      orderId: updated.id,
      status: updated.status,
      order: publicOrderView(updated)
    });

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Staff revise quotation
app.post('/api/orders/:id/quote', authenticate, requireRole('staff', 'admin', 'super_admin'), (req, res) => {
  try {
    const { revisedAmount, reason, staffName } = req.body;
    const updated = db.reviseOrderQuote(req.params.id, { revisedAmount, reason, staffName });
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    io.to('staff').emit('order:quote_revised', { orderId: updated.id, order: updated });
    io.to(`order:${updated.id}`).emit('order:quote_revised', {
      orderId: updated.id,
      order: publicOrderView(updated)
    });

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Customer accept quotation
app.post('/api/orders/:id/accept-quote', (req, res) => {
  try {
    const updated = db.customerAcceptQuote(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Order or quotation not found' });
    }

    io.to('staff').emit('order:quote_accepted', { orderId: updated.id, order: updated });
    io.to(`order:${updated.id}`).emit('order:quote_accepted', {
      orderId: updated.id,
      order: publicOrderView(updated)
    });

    res.json({ success: true, order: publicOrderView(updated) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update payment information
app.patch('/api/orders/:id/payment', authenticate, requireRole('staff', 'admin', 'super_admin'), (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const updated = db.updatePayment(req.params.id, { paymentStatus, paymentMethod });
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    io.to('staff').emit('order:payment_updated', { orderId: updated.id, order: updated });
    io.to(`order:${updated.id}`).emit('order:payment_updated', {
      orderId: updated.id,
      order: publicOrderView(updated)
    });

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve frontend in production or if dist exists
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

server.listen(PORT, () => {
  console.log(`Print Plus Server running on http://localhost:${PORT}`);
});
