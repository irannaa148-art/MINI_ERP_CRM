import { Request, Response, NextFunction } from 'express';
import { ChallanStatus, CustomerStatus } from '@prisma/client';
import { prisma } from '../config/db';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      activeCustomers,
      leadCustomers,
      allProducts,
      draftChallansMonth,
      confirmedChallansMonth,
      monthlyRevenueResult,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
      prisma.customer.count({ where: { status: CustomerStatus.LEAD } }),
      prisma.product.findMany({ select: { id: true, currentStock: true, minStockAlert: true } }),
      prisma.challan.count({
        where: {
          status: ChallanStatus.DRAFT,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.challan.count({
        where: {
          status: ChallanStatus.CONFIRMED,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.challan.aggregate({
        where: {
          status: ChallanStatus.CONFIRMED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStockAlert).length;
    const monthlyRevenue = monthlyRevenueResult._sum.totalAmount || 0;

    return res.status(200).json({
      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          lead: leadCustomers,
        },
        inventory: {
          totalProducts: allProducts.length,
          lowStockCount,
        },
        challansThisMonth: {
          draft: draftChallansMonth,
          confirmed: confirmedChallansMonth,
          revenue: monthlyRevenue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
