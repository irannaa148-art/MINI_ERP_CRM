import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';
import { prisma } from '../config/db';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    mobile: z.string().min(8, 'Mobile number must be at least 8 digits'),
    email: z.string().email('Invalid email address').optional().nullable(),
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    gstNumber: z.string().optional().nullable(),
    customerType: z.nativeEnum(CustomerType).optional().default(CustomerType.WHOLESALE),
    address: z.string().min(3, 'Address is required'),
    status: z.nativeEnum(CustomerStatus).optional().default(CustomerStatus.ACTIVE),
    followUpDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    mobile: z.string().min(8).optional(),
    email: z.string().email().optional().nullable(),
    businessName: z.string().min(2).optional(),
    gstNumber: z.string().optional().nullable(),
    customerType: z.nativeEnum(CustomerType).optional(),
    address: z.string().min(3).optional(),
    status: z.nativeEnum(CustomerStatus).optional(),
    followUpDate: z.string().optional().nullable(),
  }),
});

export const addCustomerNoteSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Note text cannot be empty'),
  }),
});

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email || null,
        businessName,
        gstNumber: gstNumber || null,
        customerType: customerType || CustomerType.WHOLESALE,
        address,
        status: status || CustomerStatus.ACTIVE,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        ...(notes && req.user
          ? {
              notesHistory: {
                create: {
                  text: notes,
                  createdById: req.user.userId,
                },
              },
            }
          : {}),
      },
      include: {
        notesHistory: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    return res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const q = req.query.q as string | undefined;
    const status = req.query.status as CustomerStatus | undefined;
    const type = req.query.type as CustomerType | undefined;

    const where: any = {};

    if (status && Object.values(CustomerStatus).includes(status)) {
      where.status = status;
    }

    if (type && Object.values(CustomerType).includes(type)) {
      where.customerType = type;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { challans: true, notesHistory: true } },
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

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        notesHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        error: { message: 'Customer not found.' },
      });
    }

    return res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        error: { message: 'Customer not found.' },
      });
    }

    const { followUpDate, ...otherFields } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...otherFields,
        ...(followUpDate !== undefined
          ? { followUpDate: followUpDate ? new Date(followUpDate) : null }
          : {}),
      },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const addCustomerNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: { message: 'Unauthenticated.' } });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ error: { message: 'Customer not found.' } });
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId: id,
        text,
        createdById: req.user.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({ data: note });
  } catch (error) {
    next(error);
  }
};
