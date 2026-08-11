import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { uploadProductImage } from '../services/s3Service';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name is required'),
    sku: z.string().min(2, 'SKU is required'),
    category: z.string().min(2, 'Category is required'),
    unitPrice: z.coerce.number().positive('Unit price must be positive'),
    currentStock: z.coerce.number().int().min(0, 'Current stock must be non-negative').optional().default(0),
    minStockAlert: z.coerce.number().int().min(0).optional().default(10),
    location: z.string().min(2, 'Warehouse location is required'),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    sku: z.string().min(2).optional(),
    category: z.string().min(2).optional(),
    unitPrice: z.coerce.number().positive().optional(),
    currentStock: z.coerce.number().int().min(0).optional(),
    minStockAlert: z.coerce.number().int().min(0).optional(),
    location: z.string().min(2).optional(),
  }),
});

export const stockMovementSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
    movementType: z.nativeEnum(MovementType),
    reason: z.string().min(2, 'Reason is required'),
  }),
});

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let imageUrl: string | undefined = undefined;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;

    const existingSku = await prisma.product.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });

    if (existingSku) {
      return res.status(409).json({
        error: { message: `Product with SKU '${sku}' already exists.`, field: 'sku' },
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku.trim().toUpperCase(),
        category,
        unitPrice: new Prisma.Decimal(unitPrice),
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 10,
        location,
        imageUrl: imageUrl || null,
      },
    });

    // If initial stock > 0, log an initial IN movement
    if (product.currentStock > 0 && req.user) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: product.currentStock,
          movementType: MovementType.IN,
          reason: 'Initial Inventory Setup',
          createdById: req.user.userId,
        },
      });
    }

    return res.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;
    const lowStock = req.query.lowStock === 'true';

    const where: any = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Prisma doesn't directly support comparing two columns in where clause across all engines without raw filter or JS filter,
    // so we handle lowStock filter cleanly
    let products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Enhance with lowStock flag logic
    let processed = products.map((p) => ({
      ...p,
      isLowStock: p.currentStock <= p.minStockAlert,
    }));

    if (lowStock) {
      processed = processed.filter((p) => p.isLowStock);
    }

    const total = processed.length;
    const paginated = processed.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      data: paginated,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    return res.status(200).json({
      data: {
        ...product,
        isLowStock: product.currentStock <= product.minStockAlert,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    let imageUrl = existing.imageUrl;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl;
    }

    const { sku, unitPrice, ...otherFields } = req.body;

    if (sku && sku.trim().toUpperCase() !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({
        where: { sku: sku.trim().toUpperCase() },
      });
      if (duplicateSku) {
        return res.status(409).json({
          error: { message: `Product with SKU '${sku}' already exists.`, field: 'sku' },
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...otherFields,
        ...(sku ? { sku: sku.trim().toUpperCase() } : {}),
        ...(unitPrice ? { unitPrice: new Prisma.Decimal(unitPrice) } : {}),
        imageUrl,
      },
    });

    return res.status(200).json({
      data: {
        ...updated,
        isLowStock: updated.currentStock <= updated.minStockAlert,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductStockLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(200).json({ data: movements });
  } catch (error) {
    next(error);
  }
};

export const recordStockMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { quantity, movementType, reason } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: { message: 'Unauthenticated.' } });
    }

    const qty = Number(quantity);

    // Execute stock update and log creation inside an atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      let newStock = product.currentStock;
      if (movementType === MovementType.IN) {
        newStock += qty;
      } else if (movementType === MovementType.OUT) {
        if (product.currentStock < qty) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        newStock -= qty;
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          quantity: qty,
          movementType,
          reason,
          createdById: req.user!.userId,
        },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return { product: updatedProduct, movement };
    });

    return res.status(200).json({
      data: {
        product: {
          ...result.product,
          isLowStock: result.product.currentStock <= result.product.minStockAlert,
        },
        movement: result.movement,
      },
    });
  } catch (error: any) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: { message: 'Product not found.' } });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        error: { message: 'Cannot complete OUT movement. Requested quantity exceeds available current stock.' },
      });
    }
    next(error);
  }
};
