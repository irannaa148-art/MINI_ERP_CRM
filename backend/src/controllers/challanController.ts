import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChallanStatus, MovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { generateInvoicePDF } from '../services/pdfService';

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid product ID'),
          quantity: z.number().int().positive('Quantity must be positive'),
        })
      )
      .min(1, 'Challan must contain at least one line item'),
  }),
});

export const updateChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1)
      .optional(),
  }),
});

// Helper function to generate auto-incrementing sequential Challan Number (e.g. CH-2026-0001)
const generateChallanNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `CH-${currentYear}-`;

  const lastChallan = await tx.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: 'desc' },
  });

  let nextSequence = 1;
  if (lastChallan) {
    const parts = lastChallan.challanNumber.split('-');
    const lastSeqStr = parts[parts.length - 1];
    const parsedSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(parsedSeq)) {
      nextSequence = parsedSeq + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(4, '0')}`;
};

export const createChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, items } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Unauthenticated.' } });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ error: { message: 'Customer not found.', field: 'customerId' } });
    }

    // Fetch product details for snapshotting
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: { message: 'One or more selected products do not exist.' } });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate line items snapshot and grand total
    let totalQuantity = 0;
    let totalAmount = new Prisma.Decimal(0);

    const challanItemsData = items.map((item: { productId: string; quantity: number }) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.unitPrice.mul(item.quantity);

      totalQuantity += item.quantity;
      totalAmount = totalAmount.add(lineTotal);

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.unitPrice,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const challan = await prisma.$transaction(async (tx) => {
      const challanNumber = await generateChallanNumber(tx);

      return await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status: ChallanStatus.DRAFT,
          totalQuantity,
          totalAmount,
          createdById: req.user!.userId,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true, role: true } },
          items: true,
        },
      });
    });

    return res.status(201).json({ data: challan });
  } catch (error) {
    next(error);
  }
};

export const getChallans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const q = req.query.q as string | undefined;
    const status = req.query.status as ChallanStatus | undefined;
    const customerId = req.query.customerId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = {};

    if (status && Object.values(ChallanStatus).includes(status)) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (q) {
      where.OR = [
        { challanNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { businessName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true, mobile: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          items: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      data,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getChallanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, currentStock: true, minStockAlert: true } },
          },
        },
      },
    });

    if (!challan) {
      return res.status(404).json({ error: { message: 'Challan not found.' } });
    }

    return res.status(200).json({ data: challan });
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { customerId, items } = req.body;

    const existing = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Challan not found.' } });
    }

    if (existing.status !== ChallanStatus.DRAFT) {
      return res.status(400).json({
        error: { message: `Cannot edit challan in '${existing.status}' status. Only DRAFT challans can be edited.` },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let totalQuantity = existing.totalQuantity;
      let totalAmount = existing.totalAmount;

      if (items) {
        // Delete existing items
        await tx.challanItem.deleteMany({ where: { challanId: id } });

        const productIds = items.map((i: any) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          throw new Error('INVALID_PRODUCTS');
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        totalQuantity = 0;
        totalAmount = new Prisma.Decimal(0);

        const newItemsData = items.map((item: { productId: string; quantity: number }) => {
          const product = productMap.get(item.productId)!;
          const lineTotal = product.unitPrice.mul(item.quantity);

          totalQuantity += item.quantity;
          totalAmount = totalAmount.add(lineTotal);

          return {
            challanId: id,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            unitPrice: product.unitPrice,
            quantity: item.quantity,
            lineTotal,
          };
        });

        await tx.challanItem.createMany({ data: newItemsData });
      }

      return await tx.challan.update({
        where: { id },
        data: {
          ...(customerId ? { customerId } : {}),
          totalQuantity,
          totalAmount,
        },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true, role: true } },
          items: true,
        },
      });
    });

    return res.status(200).json({ data: updated });
  } catch (error: any) {
    if (error.message === 'INVALID_PRODUCTS') {
      return res.status(400).json({ error: { message: 'One or more selected products do not exist.' } });
    }
    next(error);
  }
};

export const confirmChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Unauthenticated.' } });
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: true,
        items: true,
      },
    });

    if (!challan) {
      return res.status(404).json({ error: { message: 'Challan not found.' } });
    }

    if (challan.status === ChallanStatus.CONFIRMED) {
      return res.status(400).json({ error: { message: 'Challan is already confirmed.' } });
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      return res.status(400).json({ error: { message: 'Cannot confirm a cancelled challan.' } });
    }

    // Atomic DB transaction for checking and decrementing stock
    const confirmedChallan = await prisma.$transaction(async (tx) => {
      // 1. Re-check current stock for every line item
      const shortProducts: Array<{ productId: string; name: string; sku: string; requested: number; available: number }> = [];

      for (const item of challan.items) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.currentStock < item.quantity) {
          shortProducts.push({
            productId: item.productId,
            name: item.productName,
            sku: item.productSku,
            requested: item.quantity,
            available: product ? product.currentStock : 0,
          });
        }
      }

      // 2. Abort transaction if any stock is short
      if (shortProducts.length > 0) {
        const errorDetail = shortProducts
          .map((sp) => `'${sp.name}' (SKU: ${sp.sku}, Requested: ${sp.requested}, Available: ${sp.available})`)
          .join(', ');
        
        const err = new Error(`INSUFFICIENT_STOCK: ${errorDetail}`);
        (err as any).shortProducts = shortProducts;
        throw err;
      }

      // 3. Decrement stock and write StockMovement log (type OUT) for every line item
      for (const item of challan.items) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan ${challan.challanNumber}`,
            createdById: req.user!.userId,
          },
        });
      }

      // 4. Update Challan status to CONFIRMED
      return await tx.challan.update({
        where: { id },
        data: {
          status: ChallanStatus.CONFIRMED,
          pdfUrl: `/api/challans/${id}/invoice`,
        },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true, role: true } },
          items: true,
        },
      });
    });

    return res.status(200).json({
      data: confirmedChallan,
      message: `Challan ${confirmedChallan.challanNumber} successfully confirmed and inventory updated.`,
    });
  } catch (error: any) {
    if (error.message && error.message.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(400).json({
        error: {
          message: error.message.replace('INSUFFICIENT_STOCK: ', 'Insufficient inventory to confirm challan: '),
          shortProducts: error.shortProducts,
        },
      });
    }
    next(error);
  }
};

export const cancelChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Unauthenticated.' } });
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      return res.status(404).json({ error: { message: 'Challan not found.' } });
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      return res.status(400).json({ error: { message: 'Challan is already cancelled.' } });
    }

    const wasConfirmed = challan.status === ChallanStatus.CONFIRMED;

    const cancelledChallan = await prisma.$transaction(async (tx) => {
      // If it was Confirmed, restore stock (type IN movement)
      if (wasConfirmed) {
        for (const item of challan.items) {
          if (!item.productId) continue;

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.IN,
              reason: 'Challan Cancelled',
              createdById: req.user!.userId,
            },
          });
        }
      }

      return await tx.challan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: {
          customer: true,
          createdBy: { select: { id: true, name: true, role: true } },
          items: true,
        },
      });
    });

    return res.status(200).json({
      data: cancelledChallan,
      message: wasConfirmed
        ? `Challan ${cancelledChallan.challanNumber} cancelled and stock restored.`
        : `Challan ${cancelledChallan.challanNumber} cancelled.`,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadChallanInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: true,
        items: true,
      },
    });

    if (!challan) {
      return res.status(404).json({ error: { message: 'Challan not found.' } });
    }

    if (challan.status !== ChallanStatus.CONFIRMED) {
      return res.status(400).json({
        error: { message: 'Invoice PDF is only available for CONFIRMED challans.' },
      });
    }

    const pdfBuffer = await generateInvoicePDF(challan);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${challan.challanNumber}.pdf`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
