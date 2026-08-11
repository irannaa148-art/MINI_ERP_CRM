import { PrismaClient, Role, CustomerType, CustomerStatus, ChallanStatus, MovementType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Mini ERP + CRM Database...');

  // Clear existing data in reverse order of dependencies
  await prisma.challanItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.challan.deleteMany({});
  await prisma.customerNote.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users for all 4 Roles
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@minierp.com',
      password: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sarah Sales Manager',
      email: 'sales@minierp.com',
      password: defaultPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Wayne Warehouse Manager',
      email: 'warehouse@minierp.com',
      password: defaultPasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Alex Accounts Manager',
      email: 'accounts@minierp.com',
      password: defaultPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('✅ Created 4 role test users: admin, sales, warehouse, accounts.');

  // 2. Create Sample Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'rajesh@apexwholesalers.com',
      businessName: 'Apex Wholesalers Ltd',
      gstNumber: '07AAAAA0000A1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 42, Okhla Industrial Area Phase III, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 5),
      notesHistory: {
        create: [
          {
            text: 'Initial onboarding meeting completed. Interested in quarterly bulk order contract.',
            createdById: salesUser.id,
          },
          {
            text: 'Agreed on 10% volume discount for orders exceeding 500 units.',
            createdById: salesUser.id,
          },
        ],
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Anita Sharma',
      mobile: '+919811223344',
      email: 'anita@metroretail.in',
      businessName: 'Metro Retail Outlets',
      gstNumber: '27BBBCA1111B2Z2',
      customerType: CustomerType.RETAIL,
      address: 'Shop 14, Commercial Complex, Andheri East, Mumbai',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 86400000 * 2),
      notesHistory: {
        create: [
          {
            text: 'Requested quotation for high-speed wireless routers.',
            createdById: salesUser.id,
          },
        ],
      },
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Vikram Patel',
      mobile: '+919988776655',
      email: 'vikram@globaldistributors.com',
      businessName: 'Global Tech Distributors',
      gstNumber: '24CCCDD2222C3Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: '102 Tech Park, SG Highway, Ahmedabad',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 86400000 * 10),
    },
  });

  console.log('✅ Created sample customers with follow-up notes.');

  // 3. Create Sample Products
  const prod1 = await prisma.product.create({
    data: {
      name: 'Industrial Wi-Fi 6 Router AX3000',
      sku: 'WIFI-AX3000-IND',
      category: 'Networking',
      unitPrice: 149.99,
      currentStock: 120,
      minStockAlert: 15,
      location: 'Rack A-12',
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Smart Gigabit 24-Port Managed Switch',
      sku: 'SW-GB-24P-MNG',
      category: 'Networking',
      unitPrice: 289.50,
      currentStock: 8, // Below min stock alert (10) -> LOW STOCK
      minStockAlert: 10,
      location: 'Rack A-14',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: 'Cat6 Shielded Ethernet Cable 305m Reel',
      sku: 'CAB-CAT6-305M',
      category: 'Cabling',
      unitPrice: 85.00,
      currentStock: 250,
      minStockAlert: 30,
      location: 'Bin B-03',
      imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500&auto=format&fit=crop',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: '1000VA UPS Battery Backup System',
      sku: 'UPS-1000VA-PWR',
      category: 'Power Protection',
      unitPrice: 199.00,
      currentStock: 4, // Low stock!
      minStockAlert: 8,
      location: 'Rack C-01',
      imageUrl: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=500&auto=format&fit=crop',
    },
  });

  console.log('✅ Created sample products with stock counts & min-stock alerts.');

  // Create initial stock movement logs
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: prod1.id,
        quantity: 120,
        movementType: MovementType.IN,
        reason: 'Initial Vendor Shipment',
        createdById: warehouseUser.id,
      },
      {
        productId: prod2.id,
        quantity: 20,
        movementType: MovementType.IN,
        reason: 'Initial Stock',
        createdById: warehouseUser.id,
      },
      {
        productId: prod2.id,
        quantity: 12,
        movementType: MovementType.OUT,
        reason: 'Manual Inventory Adjustment (Damaged Unit Clearance)',
        createdById: warehouseUser.id,
      },
      {
        productId: prod3.id,
        quantity: 250,
        movementType: MovementType.IN,
        reason: 'Warehouse Batch Receive',
        createdById: warehouseUser.id,
      },
      {
        productId: prod4.id,
        quantity: 4,
        movementType: MovementType.IN,
        reason: 'Sample Order Receive',
        createdById: warehouseUser.id,
      },
    ],
  });

  // 4. Create Sample Sales Challans
  // Challan 1: Confirmed
  const challan1 = await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customer1.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 15,
      totalAmount: 2249.85,
      pdfUrl: '/api/challans/CH-2026-0001/invoice',
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod1.id,
            productName: prod1.name,
            productSku: prod1.sku,
            unitPrice: prod1.unitPrice,
            quantity: 10,
            lineTotal: 1499.90,
          },
          {
            productId: prod3.id,
            productName: prod3.name,
            productSku: prod3.sku,
            unitPrice: prod3.unitPrice,
            quantity: 5,
            lineTotal: 425.00,
          },
        ],
      },
    },
  });

  // Log stock movement for confirmed challan
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: prod1.id,
        quantity: 10,
        movementType: MovementType.OUT,
        reason: `Sales Challan ${challan1.challanNumber}`,
        createdById: salesUser.id,
      },
      {
        productId: prod3.id,
        quantity: 5,
        movementType: MovementType.OUT,
        reason: `Sales Challan ${challan1.challanNumber}`,
        createdById: salesUser.id,
      },
    ],
  });

  // Challan 2: Draft
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0002',
      customerId: customer2.id,
      status: ChallanStatus.DRAFT,
      totalQuantity: 2,
      totalAmount: 579.00,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod2.id,
            productName: prod2.name,
            productSku: prod2.sku,
            unitPrice: prod2.unitPrice,
            quantity: 2,
            lineTotal: 579.00,
          },
        ],
      },
    },
  });

  // Challan 3: Cancelled
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0003',
      customerId: customer3.id,
      status: ChallanStatus.CANCELLED,
      totalQuantity: 1,
      totalAmount: 199.00,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod4.id,
            productName: prod4.name,
            productSku: prod4.sku,
            unitPrice: prod4.unitPrice,
            quantity: 1,
            lineTotal: 199.00,
          },
        ],
      },
    },
  });

  console.log('✅ Created sample challans in DRAFT, CONFIRMED, and CANCELLED states.');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
